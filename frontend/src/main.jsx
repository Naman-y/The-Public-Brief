import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, CheckCircle, Edit3, LogOut, Menu, PenLine, ShieldCheck, UserRound, X, XCircle } from "lucide-react";
import "./styles.css";

const configuredApiUrl = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const API = configuredApiUrl || (import.meta.env.DEV ? "http://localhost:5000" : "");

const CATEGORIES = [
  "BREAKING NEWS",
  "CULTURE",
  "FEATURES",
  "NEWS",
  "OPINION",
  "PHOTO",
  "POLITICS",
  "SOCIETY",
  "INTERNATIONAL",
  "NATIONAL",
];

const seedArticles = [
  {
    _id: "seed-1",
    title: "Public Policy In The Age Of Fast Opinion",
    slug: "public-policy-in-the-age-of-fast-opinion",
    category: "NATIONAL",
    excerpt: "A measured look at how public institutions can respond when attention moves faster than evidence.",
    content:
      "The best public work still begins with patient facts. In an age of fast reactions, policy writing needs to slow the room down, separate signal from noise, and keep citizens close to the evidence that shapes decisions.",
    createdAt: new Date().toISOString(),
    status: "published",
    author: { _id: "seed-author-1", name: "Editorial Desk", title: "Founding Editor", avatar: "" }
  },
  {
    _id: "seed-2",
    title: "Cities Need Cleaner Data Before Cleaner Debates",
    slug: "cities-need-cleaner-data-before-cleaner-debates",
    category: "CIVIC",
    excerpt: "Urban arguments improve when local data is readable, public, and attached to lived experience.",
    content:
      "A city cannot fix what it cannot describe. Better local journalism links public data with street-level reporting, giving residents a shared map for housing, transport, health, and climate choices.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: "published",
    author: { _id: "seed-author-2", name: "Mira Sen", title: "Civic Affairs Analyst", avatar: "" }
  }
];

function initials(name = "PB") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function api(path, options = {}) {
  if (!API) {
    throw new Error("The production API URL is not configured. Set VITE_API_URL and redeploy the frontend.");
  }
  const token = localStorage.getItem("tpb_token");
  const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

function StatusBadge({ status }) {
  const map = {
    published: { label: "Published", cls: "badge-published" },
    pending: { label: "Pending Review", cls: "badge-pending" },
    rejected: { label: "Rejected", cls: "badge-rejected" },
  };
  const s = map[status] || map["pending"];
  return <span className={`status-badge ${s.cls}`}><span className="badge-dot" />{s.label}</span>;
}

function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [articles, setArticles] = useState(seedArticles);
  const [authors, setAuthors] = useState([]);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("tpb_user") || "null"));
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    refreshContent();
  }, []);

  async function refreshContent() {
    try {
      const [articleData, authorData] = await Promise.all([api("/api/articles"), api("/api/authors")]);
      setArticles(articleData.length ? articleData : seedArticles);
      setAuthors(authorData);
    } catch (_error) {
      setArticles(seedArticles);
    }
  }

  function navigate(path) {
    window.history.pushState({}, "", path);
    setRoute(path);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveSession(payload) {
    localStorage.setItem("tpb_token", payload.token);
    localStorage.setItem("tpb_user", JSON.stringify(payload.user));
    setUser(payload.user);
    setNotice(`Welcome, ${payload.user.name}. Your member desk is ready.`);
    refreshContent();
    navigate(payload.user.role === "admin" ? "/admin" : "/studio");
  }

  function logout() {
    localStorage.removeItem("tpb_token");
    localStorage.removeItem("tpb_user");
    setUser(null);
    navigate("/");
  }

  const categories = useMemo(() => ["ALL", ...new Set(articles.map((a) => a.category))], [articles]);
  const currentArticle = route.startsWith("/article/") ? articles.find((a) => a.slug === route.split("/").pop()) : null;
  const authorId = route.startsWith("/author/") ? route.split("/").pop() : "";

  return (
    <>
      <Header navigate={navigate} route={route} user={user} logout={logout} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {notice && <button className="toast" onClick={() => setNotice("")}>{notice}</button>}
      <main>
        {route === "/" && <Home articles={articles} categories={categories} navigate={navigate} />}
        {route === "/authors" && <Authors authors={authors} articles={articles} navigate={navigate} />}
        {route.startsWith("/author/") && <AuthorPage authorId={authorId} fallbackAuthors={authors} fallbackArticles={articles} navigate={navigate} />}
        {route === "/register" && <Auth mode="register" onDone={saveSession} switchMode={() => navigate("/login")} />}
        {route === "/login" && <Auth mode="login" onDone={saveSession} switchMode={() => navigate("/register")} />}
        {route === "/studio" && <Studio user={user} setUser={setUser} articles={articles} refresh={refreshContent} navigate={navigate} />}
        {route === "/studio/new" && <NewPost user={user} refresh={refreshContent} navigate={navigate} />}
        {route === "/admin" && <AdminDashboard user={user} refreshPublic={refreshContent} navigate={navigate} />}
        {route === "/about" && <StaticPage title="About The Public Brief" text="The Public Brief is a member-led journal for civic, political, cultural, and international writing. It is built for contributors who want careful arguments, strong reporting, and a composed place to publish." />}
        {route === "/contact" && <StaticPage title="Contact" text="For collaborations, editorial queries, and corrections, write to desk@thepublicbrief.example. Members can register and begin publishing from the writer studio." />}
        {route === "/support" && <SupportPage />}
        {route.startsWith("/article/") && <ArticlePage article={currentArticle} navigate={navigate} />}
      </main>
      <Footer navigate={navigate} />
    </>
  );
}

function Header({ navigate, route, user, logout, menuOpen, setMenuOpen }) {
  const links = [
    ["/", "Home"],
    ["/", "National"],
    ["/", "International"],
    ["/authors", "Authors"],
    ["/about", "About"],
    ["/contact", "Contact"],
    ["/support", "Support"]
  ];

  return (
    <header className="site-header">
      <button className="brand" onClick={() => navigate("/")}>
        <img className="brand-logo" src="/tpb-logo.jpeg" alt="TPB" />
        <span>The Public Brief</span>
      </button>
      <button className="icon-button mobile-only" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
        {menuOpen ? <X /> : <Menu />}
      </button>
      <nav className={menuOpen ? "open" : ""}>
        {links.map(([path, label]) => (
          <button key={label} className={route === path ? "active" : ""} onClick={() => navigate(label === "National" || label === "International" ? "/" : path)}>
            {label}
          </button>
        ))}
        {user ? (
          <>
            {user.role === "admin" && <button className="desk-link" onClick={() => navigate("/admin")}><ShieldCheck size={16} /> Admin</button>}
            <button className="desk-link" onClick={() => navigate("/studio")}><PenLine size={16} /> My Posts</button>
            <button className="icon-button" onClick={logout} aria-label="Log out"><LogOut size={18} /></button>
          </>
        ) : (
          <>
            <button className="admin-login-link" onClick={() => navigate("/login")}><ShieldCheck size={16} /> Admin Login</button>
            <button className="join-link" onClick={() => navigate("/register")}><UserRound size={16} /> Register</button>
          </>
        )}
      </nav>
    </header>
  );
}

function Home({ articles, categories, navigate }) {
  const [category, setCategory] = useState("ALL");
  const visible = category === "ALL" ? articles : articles.filter((a) => a.category === category);
  const lead = visible[0] || seedArticles[0];

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">Independent member briefings</p>
          <h1>The Public Brief</h1>
          <p>Register as a member, publish thoughtful analysis, and build a public archive of sharp writing across policy, society, economics, culture, and global affairs.</p>
          <div className="hero-actions">
            <button onClick={() => navigate("/register")}>Become a Member</button>
            <button className="ghost" onClick={() => navigate("/authors")}>Meet Authors</button>
          </div>
        </div>
        <article className="lead-brief" onClick={() => navigate(`/article/${lead.slug}`)}>
          <span>{lead.category}</span>
          <h2>{lead.title}</h2>
          <p>{lead.excerpt}</p>
          <small>By {lead.author?.name || "Member Desk"}</small>
        </article>
      </section>

      <section className="section-shell">
        <div className="section-title">
          <p className="kicker">Latest Briefs</p>
          <h2>Fresh from the member desk</h2>
          <div className="category-row">
            {categories.map((item) => (
              <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="article-grid">
          {visible.map((article) => <ArticleCard key={article._id} article={article} navigate={navigate} />)}
        </div>
      </section>
    </>
  );
}

function ArticleCard({ article, navigate }) {
  return (
    <article className="article-card" onClick={() => navigate(`/article/${article.slug}`)}>
      {article.featuredImage ? <img src={article.featuredImage} alt="" /> : <div className="image-fallback"><BookOpen size={36} /></div>}
      <div>
        <span>{article.category}</span>
        <h3>{article.title}</h3>
        <p>{article.excerpt}</p>
        <small>By {article.author?.name || "Member Desk"}</small>
      </div>
    </article>
  );
}

function Authors({ authors, articles, navigate }) {
  const displayed = authors.length ? authors : [
    { _id: "seed-author-1", name: "Editorial Desk", title: "Founding Editor", bio: "Opening space for careful public writing.", avatar: "" },
    { _id: "seed-author-2", name: "Mira Sen", title: "Civic Affairs Analyst", bio: "Reports on urban systems, public data, and local democracy.", avatar: "" }
  ];

  return (
    <section className="section-shell authors-page">
      <div className="center-title">
        <h1>Our Authors</h1>
        <p>Meet the registered members and analysts behind The Public Brief.</p>
      </div>
      <div className="author-grid">
        {displayed.map((author) => (
          <button className="author-card" key={author._id} onClick={() => navigate(`/author/${author._id}`)}>
            <Avatar author={author} />
            <h2>{author.name}</h2>
            <h3>{author.title}</h3>
            <p>{author.bio || `${articles.filter((a) => a.author?._id === author._id).length} published briefings.`}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function Avatar({ author }) {
  return author.avatar ? <img className="avatar" src={author.avatar} alt={author.name} /> : <span className="avatar">{initials(author.name)}</span>;
}

function AuthorPage({ authorId, fallbackAuthors, fallbackArticles, navigate }) {
  const [data, setData] = useState(null);
  const fallbackAuthor = fallbackAuthors.find((a) => a._id === authorId);
  const author = data?.author || fallbackAuthor || { name: "Editorial Desk", title: "Member Author", bio: "Public writing from The Public Brief.", avatar: "" };
  const articles = data?.articles || fallbackArticles.filter((a) => a.author?._id === authorId);

  useEffect(() => {
    if (!authorId.startsWith("seed")) {
      api(`/api/authors/${authorId}`).then(setData).catch(() => {});
    }
  }, [authorId]);

  return (
    <>
      <section className="author-hero">
        <Avatar author={author} />
        <div>
          <h1>{author.name}</h1>
          <h2>{author.title}</h2>
          <p>{author.bio || "A registered member of The Public Brief."}</p>
          <div className="social-row">
            {author.twitter && <a href={author.twitter}>Twitter</a>}
            {author.linkedin && <a href={author.linkedin}>LinkedIn</a>}
          </div>
        </div>
      </section>
      <section className="section-shell narrow">
        <p className="kicker">Articles by {author.name}</p>
        {articles.length ? articles.map((article) => <ArticleListItem key={article._id} article={article} navigate={navigate} />) : <p className="empty">No articles published yet.</p>}
      </section>
    </>
  );
}

function ArticleListItem({ article, navigate }) {
  return (
    <button className="list-item" onClick={() => navigate(`/article/${article.slug}`)}>
      <span>{article.category}</span>
      <h2>{article.title}</h2>
      <p>{article.excerpt}</p>
    </button>
  );
}

/* ─────────────────────────────────────────────
   AUTH — simplified: name + email + password
───────────────────────────────────────────── */
function Auth({ mode, onDone, switchMode }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const payload = isRegister
        ? await api("/api/auth/register", { method: "POST", body: form })
        : await api("/api/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
      onDone(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-panel" onSubmit={submit}>
        <p className="kicker">{isRegister ? "Member Registration" : "Member Login"}</p>
        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-subtitle">{isRegister ? "Join The Public Brief and start writing." : "Log in to access your writer studio."}</p>

        {isRegister && <input id="reg-name" name="name" placeholder="Full name" required autoComplete="name" />}
        <input id="auth-email" name="email" type="email" placeholder="Email address" required autoComplete="email" />
        <input id="auth-password" name="password" type="password" placeholder="Password" required autoComplete={isRegister ? "new-password" : "current-password"} />

        {error && <p className="form-error">{error}</p>}
        <button id="auth-submit" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Create Account" : "Login"}</button>
        <button type="button" className="text-button" onClick={switchMode}>
          {isRegister ? "Already a member? Login" : "Need an account? Register"}
        </button>
      </form>
    </section>
  );
}

/* ─────────────────────────────────────────────
   STUDIO — My Posts table + profile
───────────────────────────────────────────── */
function Studio({ user, setUser, articles, refresh, navigate }) {
  const [submissions, setSubmissions] = useState([]);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) loadSubmissions();
  }, [user]);

  if (!user) {
    return (
      <section className="auth-page">
        <div className="auth-panel">
          <p className="kicker">Registration Required</p>
          <h1>Members write here first.</h1>
          <p>Please register or log in before publishing an article.</p>
          <button onClick={() => navigate("/register")}>Register Now</button>
        </div>
      </section>
    );
  }

  async function loadSubmissions() {
    try {
      setSubmissions(await api("/api/me/articles"));
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this article?")) return;
    await api(`/api/articles/${id}`, { method: "DELETE" });
    await Promise.all([refresh(), loadSubmissions()]);
  }

  async function updateProfile(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setProfileBusy(true);
    setProfileError("");
    setProfileNotice("");
    try {
      const payload = await api("/api/auth/profile", { method: "PUT", body: new FormData(form) });
      localStorage.setItem("tpb_user", JSON.stringify(payload.user));
      setUser(payload.user);
      setProfileNotice("Profile updated.");
      await Promise.all([refresh(), loadSubmissions()]);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileBusy(false);
    }
  }

  const mine = submissions.length ? submissions : articles.filter((a) => a.author?._id === user._id);
  const publishedCount = mine.filter((a) => a.status === "published").length;
  const pendingCount = mine.filter((a) => a.status === "pending").length;

  return (
    <section className="studio">
      {/* LEFT: Posts List */}
      <div className="studio-main">
        {/* Stats row */}
        <div className="studio-stats">
          <div className="stat-card">
            <span className="stat-num">{mine.length}</span>
            <span className="stat-label">Total Articles</span>
          </div>
          <div className="stat-card stat-green">
            <span className="stat-num">{publishedCount}</span>
            <span className="stat-label">Published</span>
          </div>
          <div className="stat-card stat-amber">
            <span className="stat-num">{pendingCount}</span>
            <span className="stat-label">Pending Review</span>
          </div>
        </div>

        {/* Posts header */}
        <div className="posts-header">
          <div>
            <p className="kicker">Writer Studio</p>
            <h2>My Posts</h2>
          </div>
          <button id="new-post-btn" className="new-post-btn" onClick={() => navigate("/studio/new")}>
            <PenLine size={16} /> Add New Post
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        {/* Posts table */}
        {mine.length === 0 ? (
          <div className="empty-posts">
            <BookOpen size={48} />
            <p>You haven't written anything yet.</p>
            <button onClick={() => navigate("/studio/new")}>Write your first article</button>
          </div>
        ) : (
          <div className="posts-table">
            <div className="posts-table-head">
              <span>Title</span>
              <span>Category</span>
              <span>Status</span>
              <span>Date</span>
              <span></span>
            </div>
            {mine.map((article) => (
              <div className="posts-table-row" key={article._id}>
                <div className="post-title-cell">
                  {article.status === "published"
                    ? <button className="post-title-link" onClick={() => navigate(`/article/${article.slug}`)}>{article.title}</button>
                    : <span className="post-title-plain">{article.title}</span>
                  }
                  {article.rejectionReason && (
                    <small className="rejection-note">Reason: {article.rejectionReason}</small>
                  )}
                </div>
                <span className="post-cat-cell">{article.category}</span>
                <span className="post-status-cell"><StatusBadge status={article.status || "pending"} /></span>
                <span className="post-date-cell">{new Date(article.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="post-actions-cell">
                  <button className="row-delete-btn" title="Delete" onClick={() => remove(article._id)}><XCircle size={16} /></button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Profile panel */}
      <div className="studio-sidebar">
        <div className="profile-panel">
          <p className="kicker">Profile</p>
          <h2>Edit Profile</h2>
          <form onSubmit={updateProfile}>
            <div className="profile-preview-row">
              <Avatar author={user} />
              <label className="file-label">Profile Image<input name="avatar" type="file" accept="image/*" /></label>
            </div>
            <input name="name" defaultValue={user.name || ""} placeholder="Full name" required />
            <input name="title" defaultValue={user.title || ""} placeholder="Position / Title" />
            <textarea name="bio" defaultValue={user.bio || ""} placeholder="Short bio" rows="4" />
            <input name="twitter" defaultValue={user.twitter || ""} placeholder="Twitter URL (optional)" />
            <input name="linkedin" defaultValue={user.linkedin || ""} placeholder="LinkedIn URL (optional)" />
            {profileError && <p className="form-error">{profileError}</p>}
            {profileNotice && <p className="form-success">{profileNotice}</p>}
            <button disabled={profileBusy}>{profileBusy ? "Saving…" : "Save Profile"}</button>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   NEW POST PAGE — like WordPress Add Post
───────────────────────────────────────────── */
function NewPost({ user, refresh, navigate }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!user) {
    return (
      <section className="auth-page">
        <div className="auth-panel">
          <p className="kicker">Login Required</p>
          <h1>Please log in to write.</h1>
          <button onClick={() => navigate("/login")}>Login</button>
        </div>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="auth-page">
        <div className="auth-panel submitted-panel">
          <div className="submitted-icon"><CheckCircle size={56} /></div>
          <p className="kicker">Submitted Successfully</p>
          <h1>Article sent for review</h1>
          <p>Your article has been submitted and is now <strong>Pending Review</strong>. The admin will review and publish it.</p>
          <button onClick={() => navigate("/studio")}>View My Posts</button>
          <button className="text-button" onClick={() => { setSubmitted(false); setTitle(""); setContent(""); setExcerpt(""); setCategory(""); }}>Write Another</button>
        </div>
      </section>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/articles", { method: "POST", body: form });
      await refresh();
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <section className="new-post-page">
      <form id="new-post-form" className="new-post-layout" onSubmit={submit}>
        {/* ── Main editor area ── */}
        <div className="post-editor">
          <div className="editor-topbar">
            <p className="kicker">Writer Studio</p>
            <h2>Add New Post</h2>
          </div>

          <input
            id="post-title"
            name="title"
            className="post-title-input"
            placeholder="Add title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="editor-toolbar">
            <span className="toolbar-label">Body</span>
            <span className="word-count">Word count: {wordCount}</span>
          </div>

          <textarea
            id="post-content"
            name="content"
            className="post-content-area"
            placeholder="Write your article here…"
            rows="18"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />

          <div className="editor-section">
            <label className="editor-label">Excerpt</label>
            <textarea
              id="post-excerpt"
              name="excerpt"
              className="post-excerpt-area"
              placeholder="Brief summary of the article…"
              rows="3"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              required
            />
          </div>

          <div className="editor-section">
            <label className="editor-label">Featured Image</label>
            <label className="file-label-styled">
              <input name="featuredImage" type="file" accept="image/*" />
              <span>Choose image…</span>
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}
        </div>

        {/* ── Right sidebar ── */}
        <div className="post-sidebar">
          {/* Publish panel */}
          <div className="publish-panel">
            <div className="publish-panel-head">
              <span>Publish</span>
            </div>
            <div className="publish-panel-body">
              <div className="publish-meta-row">
                <span className="publish-meta-label">Status:</span>
                <span className="publish-meta-value draft-chip">Draft</span>
              </div>
              <div className="publish-meta-row">
                <span className="publish-meta-label">Visibility:</span>
                <span className="publish-meta-value">Public</span>
              </div>
              <div className="publish-meta-row">
                <span className="publish-meta-label">Author:</span>
                <span className="publish-meta-value">{user.name}</span>
              </div>
              <div className="publish-notice">
                <ShieldCheck size={14} />
                <span>Admin approval required to publish</span>
              </div>
            </div>
            <div className="publish-panel-footer">
              <button
                id="submit-review-btn"
                type="submit"
                className="submit-review-btn"
                disabled={busy}
              >
                {busy ? "Submitting…" : "Submit for Review"}
              </button>
              <button
                type="button"
                className="save-draft-btn"
                onClick={() => navigate("/studio")}
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Categories panel */}
          <div className="sidebar-panel">
            <div className="sidebar-panel-head">
              <span>Category / Domain</span>
            </div>
            <div className="sidebar-panel-body">
              <select
                id="post-category"
                name="category"
                className="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="" disabled>Select a category…</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat.charAt(0) + cat.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags/SEO note */}
          <div className="sidebar-panel">
            <div className="sidebar-panel-head">
              <span>Note</span>
            </div>
            <div className="sidebar-panel-body sidebar-note">
              <p>Articles submitted here go directly to the editor's review queue. Only <strong>Kaifullah Khan (Admin)</strong> can approve and publish your article.</p>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}

/* ─────────────────────────────────────────────
   ADMIN DASHBOARD
───────────────────────────────────────────── */
function AdminDashboard({ user, refreshPublic, navigate }) {
  const [articles, setArticles] = useState([]);
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (user?.role === "admin") loadArticles();
  }, [user, status]);

  async function loadArticles() {
    try {
      setError("");
      setArticles(await api(`/api/admin/articles?status=${status}`));
    } catch (err) {
      setError(err.message);
    }
  }

  async function review(article, action) {
    const rejectionReason = action === "reject" ? window.prompt("Reason for rejection (optional):") || "" : "";
    setBusyId(article._id);
    try {
      await api(`/api/admin/articles/${article._id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ action, rejectionReason })
      });
      await Promise.all([loadArticles(), refreshPublic()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  if (!user || user.role !== "admin") {
    return (
      <section className="auth-page">
        <div className="auth-panel">
          <p className="kicker">Admin Login Required</p>
          <h1>Editorial review is for admins.</h1>
          <p>Please log in with an admin account to verify and publish member submissions.</p>
          <button onClick={() => navigate("/login")}>Admin Login</button>
        </div>
      </section>
    );
  }

  const tabs = [
    { key: "pending", label: "Pending" },
    { key: "published", label: "Published" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <section className="section-shell admin-page">
      <div className="admin-header">
        <div>
          <p className="kicker">Admin Dashboard</p>
          <h2>Verify Member Articles</h2>
          <p className="admin-greeting">Welcome, {user.name} — you have exclusive publishing rights.</p>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`admin-tab ${status === t.key ? "admin-tab-active" : ""}`}
            onClick={() => { setStatus(t.key); setEditingId(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="review-list">
        {articles.length ? articles.map((article) => (
          editingId === article._id
            ? <AdminEditForm
                key={article._id}
                article={article}
                onCancel={() => setEditingId(null)}
                onSave={async (form) => {
                  setBusyId(article._id);
                  try {
                    await api(`/api/admin/articles/${article._id}/edit`, { method: "PUT", body: form });
                    await Promise.all([loadArticles(), refreshPublic()]);
                    setEditingId(null);
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setBusyId("");
                  }
                }}
                busy={busyId === article._id}
              />
            : <AdminReviewCard
                key={article._id}
                article={article}
                busy={busyId === article._id}
                status={status}
                onEdit={() => setEditingId(article._id)}
                onPublish={() => review(article, "publish")}
                onReject={() => review(article, "reject")}
              />
        )) : <p className="empty">No {status} articles right now.</p>}
      </div>
    </section>
  );
}

function AdminReviewCard({ article, busy, status, onEdit, onPublish, onReject }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="review-item">
      <div className="review-item-main">
        <div className="review-meta">
          <span className="review-cat">{article.category}</span>
          <StatusBadge status={article.status} />
        </div>
        <h3>{article.title}</h3>
        <p className="review-excerpt">{article.excerpt}</p>
        <button className="expand-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Hide content ▲" : "Show full content ▼"}
        </button>
        {expanded && <p className="review-body">{article.content}</p>}
        <small className="review-author">By {article.author?.name || "Member"} ({article.author?.email || "no email"})</small>
        {article.rejectionReason && <small className="rejection-note">Rejection reason: {article.rejectionReason}</small>}
        <small className="review-date">{new Date(article.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</small>
      </div>
      <div className="review-actions">
        <button className="action-edit-btn" disabled={busy} onClick={onEdit}><Edit3 size={16} /> Edit</button>
        {status !== "published" && (
          <button className="action-publish-btn" disabled={busy} onClick={onPublish}><CheckCircle size={16} /> Publish</button>
        )}
        {status !== "rejected" && (
          <button className="action-reject-btn" disabled={busy} onClick={onReject}><XCircle size={16} /> Reject</button>
        )}
      </div>
    </article>
  );
}

function AdminEditForm({ article, onCancel, onSave, busy }) {
  const [title, setTitle] = useState(article.title);
  const [category, setCategory] = useState(article.category);
  const [excerpt, setExcerpt] = useState(article.excerpt);
  const [content, setContent] = useState(article.content);

  function submit(e) {
    e.preventDefault();
    const form = new FormData();
    form.append("title", title);
    form.append("category", category);
    form.append("excerpt", excerpt);
    form.append("content", content);
    onSave(form);
  }

  return (
    <article className="review-item admin-edit-form">
      <form onSubmit={submit} style={{ width: "100%" }}>
        <p className="kicker">Editing Article</p>
        <div className="admin-edit-grid">
          <div>
            <label className="editor-label">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="editor-label">Category</label>
            <select className="category-select" value={category} onChange={(e) => setCategory(e.target.value)} required>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat.charAt(0) + cat.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="editor-label">Excerpt</label>
        <textarea rows="3" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} required />
        <label className="editor-label">Content</label>
        <textarea rows="12" value={content} onChange={(e) => setContent(e.target.value)} required />
        <div className="admin-edit-actions">
          <button type="submit" className="action-publish-btn" disabled={busy}>{busy ? "Saving…" : "Save Changes"}</button>
          <button type="button" className="save-draft-btn" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </article>
  );
}

function ArticlePage({ article, navigate }) {
  if (!article) return <StaticPage title="Article Not Found" text="This article is not available yet." />;
  return (
    <article className="article-page">
      {article.featuredImage && <img className="article-image" src={article.featuredImage} alt="" />}
      <p className="kicker">{article.category}</p>
      <h1>{article.title}</h1>
      <button className="byline" onClick={() => navigate(`/author/${article.author?._id}`)}>
        <Avatar author={article.author || { name: "PB" }} />
        <span>By {article.author?.name || "Member Desk"}</span>
      </button>
      <p className="article-body">{article.content}</p>
    </article>
  );
}

function StaticPage({ title, text }) {
  return (
    <section className="section-shell narrow static-page">
      <p className="kicker">The Public Brief</p>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

function SupportPage() {
  const [qrMissing, setQrMissing] = useState(false);

  return (
    <section className="support-page">
      <div className="support-copy">
        <p className="kicker">Support Independent Writing</p>
        <h1>Support The Public Brief</h1>
        <p>Your contribution helps keep member-led civic writing, public analysis, and editorial review running with care.</p>
      </div>
      <div className="support-qr-panel">
        {!qrMissing ? (
          <img src="/support-qr.jpeg" alt="Payment QR code" onError={() => setQrMissing(true)} />
        ) : (
          <div className="qr-placeholder">
            <strong>Payment QR</strong>
            <span>Add your QR image as frontend/public/support-qr.jpeg</span>
          </div>
        )}
        <p>Scan to support The Public Brief</p>
      </div>
    </section>
  );
}

function Footer({ navigate }) {
  return (
    <footer>
      <button className="brand" onClick={() => navigate("/")}>
        <img className="brand-logo" src="/tpb-logo.jpeg" alt="TPB" />
        <span>The Public Brief</span>
      </button>
      <span>Member-led civic writing and analysis.</span>
    </footer>
  );
}

createRoot(document.getElementById("root")).render(<App />);
