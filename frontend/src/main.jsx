import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, CheckCircle, LogOut, Menu, PenLine, ShieldCheck, UserRound, X, XCircle } from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  const token = localStorage.getItem("tpb_token");
  const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
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
            <button className="desk-link" onClick={() => navigate("/studio")}><PenLine size={16} /> Write</button>
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

function Auth({ mode, onDone, switchMode }) {
  const [error, setError] = useState("");
  const isRegister = mode === "register";

  async function submit(e) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const payload = isRegister
        ? await api("/api/auth/register", { method: "POST", body: form })
        : await api("/api/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
      onDone(payload);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-panel" onSubmit={submit}>
        <p className="kicker">{isRegister ? "Member Registration" : "Member Login"}</p>
        <h1>{isRegister ? "Start writing for The Public Brief" : "Welcome back"}</h1>
        {isRegister && <input name="name" placeholder="Full name" required />}
        <input name="email" type="email" placeholder="Email address" required />
        <input name="password" type="password" placeholder="Password" required />
        {isRegister && (
          <>
            <input name="title" placeholder="Position / Title" />
            <textarea name="bio" placeholder="Short bio" rows="4" />
            <label className="file-label">Profile Image<input name="avatar" type="file" accept="image/*" /></label>
            <input name="twitter" placeholder="Twitter URL (optional)" />
            <input name="linkedin" placeholder="LinkedIn URL (optional)" />
          </>
        )}
        {error && <p className="form-error">{error}</p>}
        <button>{isRegister ? "Register & Open Studio" : "Login"}</button>
        <button type="button" className="text-button" onClick={switchMode}>
          {isRegister ? "Already a member? Login" : "Need an account? Register"}
        </button>
      </form>
    </section>
  );
}

function Studio({ user, setUser, articles, refresh, navigate }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);

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

  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await api("/api/articles", { method: "POST", body: new FormData(form) });
      form.reset();
      await Promise.all([refresh(), loadSubmissions()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    await api(`/api/articles/${id}`, { method: "DELETE" });
    await Promise.all([refresh(), loadSubmissions()]);
  }

  async function loadSubmissions() {
    try {
      setSubmissions(await api("/api/me/articles"));
    } catch (err) {
      setError(err.message);
    }
  }

  const mine = submissions.length ? submissions : articles.filter((article) => article.author?._id === user._id);

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

  return (
    <section className="studio">
      <div className="studio-left">
        <div className="studio-form">
          <p className="kicker">Writer Studio</p>
          <h1>Add Article</h1>
          <form onSubmit={submit}>
            <input name="category" placeholder="Category (e.g., TECHNOLOGY)" required />
            <input name="title" placeholder="Title" required />
            <textarea name="excerpt" placeholder="Brief excerpt" rows="3" required />
            <textarea name="content" placeholder="Write the full article..." rows="10" required />
            <label className="file-label">Featured Image<input name="featuredImage" type="file" accept="image/*" /></label>
            {error && <p className="form-error">{error}</p>}
            <button disabled={busy}>{busy ? "Submitting..." : "Submit for Review"}</button>
          </form>
        </div>
        <div className="profile-panel">
          <p className="kicker">Profile</p>
          <h2>Edit profile image</h2>
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
            <button disabled={profileBusy}>{profileBusy ? "Saving..." : "Save Profile"}</button>
          </form>
        </div>
      </div>
      <div className="current-list">
        <p className="kicker">My Submissions</p>
        <h2>{user.name}</h2>
        {mine.length ? mine.map((article) => (
          <div className="manage-row" key={article._id}>
            <button onClick={() => article.status === "published" && navigate(`/article/${article.slug}`)}>
              <strong>{article.title}</strong>
              <span>{article.category} / {article.status || "published"}</span>
              {article.rejectionReason && <small>{article.rejectionReason}</small>}
            </button>
            <button className="danger" onClick={() => remove(article._id)}>Delete</button>
          </div>
        )) : <p className="empty">Submit your first brief from the form. An admin will publish it after review.</p>}
      </div>
    </section>
  );
}

function AdminDashboard({ user, refreshPublic, navigate }) {
  const [articles, setArticles] = useState([]);
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

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

  return (
    <section className="section-shell admin-page">
      <div className="section-title">
        <div>
          <p className="kicker">Admin Review</p>
          <h2>Verify member articles</h2>
        </div>
        <div className="category-row">
          {["pending", "published", "rejected"].map((item) => (
            <button key={item} className={status === item ? "selected" : ""} onClick={() => setStatus(item)}>{item}</button>
          ))}
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="review-list">
        {articles.length ? articles.map((article) => (
          <article className="review-item" key={article._id}>
            <div>
              <span>{article.category} / {article.status}</span>
              <h3>{article.title}</h3>
              <p>{article.excerpt}</p>
              <p className="review-body">{article.content}</p>
              <small>By {article.author?.name || "Member"} ({article.author?.email || "no email"})</small>
              {article.rejectionReason && <small>Rejected reason: {article.rejectionReason}</small>}
            </div>
            <div className="review-actions">
              <button disabled={busyId === article._id} onClick={() => review(article, "publish")}><CheckCircle size={18} /> Publish</button>
              <button className="danger" disabled={busyId === article._id} onClick={() => review(article, "reject")}><XCircle size={18} /> Reject</button>
            </div>
          </article>
        )) : <p className="empty">No {status} articles right now.</p>}
      </div>
    </section>
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
