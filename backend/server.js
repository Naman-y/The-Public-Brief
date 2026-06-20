const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const slugify = require("slugify");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-public-brief-secret";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const allowedOrigins = new Set(
  CLIENT_URL.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):5173$/.test(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image files are allowed"));
    cb(null, true);
  }
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    title: { type: String, default: "Public Brief Member" },
    bio: { type: String, default: "" },
    avatar: { type: String, default: "" },
    twitter: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    role: { type: String, enum: ["member", "admin"], default: "member" }
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, required: true, trim: true, uppercase: true },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    featuredImage: { type: String, default: "" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "published", "rejected"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Article = mongoose.model("Article", articleSchema);

function signToken(user) {
  return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Please log in first." });

  try {
    req.userId = jwt.verify(token, JWT_SECRET).id;
    next();
  } catch (_error) {
    res.status(401).json({ message: "Your session expired. Please log in again." });
  }
}

async function adminAuth(req, res, next) {
  await auth(req, res, async () => {
    const user = await User.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access is required." });
    }
    req.user = user;
    next();
  });
}

async function uniqueSlug(title) {
  const base = slugify(title, { lower: true, strict: true }) || "brief";
  let slug = base;
  let index = 2;
  while (await Article.exists({ slug })) {
    slug = `${base}-${index}`;
    index += 1;
  }
  return slug;
}

function fileUrl(req, file) {
  return file ? `${req.protocol}://${req.get("host")}/uploads/${file.filename}` : "";
}

function publicArticleFilter(extra = {}) {
  return {
    ...extra,
    $or: [{ status: "published" }, { status: { $exists: false } }]
  };
}

async function ensureAdminUser() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
    }
    return;
  }

  await User.create({
    name: ADMIN_NAME || "Admin",
    email,
    password: await bcrypt.hash(ADMIN_PASSWORD, 12),
    title: "Editorial Administrator",
    role: "admin"
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "The Public Brief API" });
});

app.post("/api/auth/register", upload.single("avatar"), async (req, res) => {
  try {
    const { name, email, password, title, bio, twitter, linkedin } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "A member already exists with this email." });

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      title,
      bio,
      twitter,
      linkedin,
      avatar: fileUrl(req, req.file)
    });

    res.status(201).json({ token: signToken(user), user: user.toPublic() });
  } catch (error) {
    res.status(500).json({ message: error.message || "Registration failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    res.json({ token: signToken(user), user: user.toPublic() });
  } catch (error) {
    res.status(500).json({ message: error.message || "Login failed." });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  const user = await User.findById(req.userId);
  res.json({ user: user.toPublic() });
});

app.put("/api/auth/profile", auth, upload.single("avatar"), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    ["name", "title", "bio", "twitter", "linkedin"].forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });
    if (req.file) user.avatar = fileUrl(req, req.file);

    await user.save();
    res.json({ user: user.toPublic() });
  } catch (error) {
    res.status(500).json({ message: error.message || "Profile could not be updated." });
  }
});

app.get("/api/authors", async (_req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json(users);
});

app.get("/api/authors/:id", async (req, res) => {
  const author = await User.findById(req.params.id).select("-password");
  if (!author) return res.status(404).json({ message: "Author not found." });
  const articles = await Article.find(publicArticleFilter({ author: author._id })).populate("author", "name title avatar").sort({ createdAt: -1 });
  res.json({ author, articles });
});

app.get("/api/articles", async (req, res) => {
  const filter = publicArticleFilter(req.query.category ? { category: String(req.query.category).toUpperCase() } : {});
  const articles = await Article.find(filter).populate("author", "name title avatar").sort({ createdAt: -1 });
  res.json(articles);
});

app.get("/api/articles/:slug", async (req, res) => {
  const article = await Article.findOne(publicArticleFilter({ slug: req.params.slug })).populate("author", "name title bio avatar twitter linkedin");
  if (!article) return res.status(404).json({ message: "Article not found." });
  res.json(article);
});

app.get("/api/me/articles", auth, async (req, res) => {
  const articles = await Article.find({ author: req.userId }).populate("author", "name title avatar").sort({ createdAt: -1 });
  res.json(articles);
});

app.post("/api/articles", auth, upload.single("featuredImage"), async (req, res) => {
  try {
    const { title, category, excerpt, content } = req.body;
    if (!title || !category || !excerpt || !content) {
      return res.status(400).json({ message: "Title, category, excerpt, and content are required." });
    }

    const article = await Article.create({
      title,
      category,
      excerpt,
      content,
      slug: await uniqueSlug(title),
      featuredImage: fileUrl(req, req.file),
      author: req.userId,
      status: "pending"
    });

    await article.populate("author", "name title avatar");
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ message: error.message || "Article could not be submitted." });
  }
});

app.put("/api/articles/:id", auth, upload.single("featuredImage"), async (req, res) => {
  const article = await Article.findOne({ _id: req.params.id, author: req.userId });
  if (!article) return res.status(404).json({ message: "Article not found for this member." });

  ["title", "category", "excerpt", "content"].forEach((field) => {
    if (req.body[field]) article[field] = req.body[field];
  });
  if (req.body.title) article.slug = await uniqueSlug(req.body.title);
  if (req.file) article.featuredImage = fileUrl(req, req.file);
  article.status = "pending";
  article.reviewedBy = null;
  article.reviewedAt = null;
  article.rejectionReason = "";
  await article.save();
  await article.populate("author", "name title avatar");
  res.json(article);
});

app.delete("/api/articles/:id", auth, async (req, res) => {
  const article = await Article.findOneAndDelete({ _id: req.params.id, author: req.userId });
  if (!article) return res.status(404).json({ message: "Article not found for this member." });
  res.json({ message: "Article deleted." });
});

app.get("/api/admin/articles", adminAuth, async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const articles = await Article.find(filter)
    .populate("author", "name title avatar email")
    .populate("reviewedBy", "name email")
    .sort({ createdAt: -1 });
  res.json(articles);
});

app.put("/api/admin/articles/:id/edit", adminAuth, upload.single("featuredImage"), async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: "Article not found." });

    ["title", "category", "excerpt", "content"].forEach((field) => {
      if (req.body[field] !== undefined) article[field] = req.body[field];
    });
    if (req.body.title) article.slug = await uniqueSlug(req.body.title);
    if (req.file) article.featuredImage = fileUrl(req, req.file);

    await article.save();
    await article.populate("author", "name title avatar email");
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: error.message || "Article could not be updated." });
  }
});

app.patch("/api/admin/articles/:id/review", adminAuth, async (req, res) => {
  const { action, rejectionReason } = req.body;
  if (!["publish", "reject"].includes(action)) {
    return res.status(400).json({ message: "Review action must be publish or reject." });
  }

  const article = await Article.findById(req.params.id);
  if (!article) return res.status(404).json({ message: "Article not found." });

  article.status = action === "publish" ? "published" : "rejected";
  article.reviewedBy = req.user._id;
  article.reviewedAt = new Date();
  article.rejectionReason = action === "reject" ? String(rejectionReason || "").trim() : "";
  await article.save();
  await article.populate("author", "name title avatar email");
  await article.populate("reviewedBy", "name email");
  res.json(article);
});

mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/the-public-brief")
  .then(async () => {
    await ensureAdminUser();
    app.listen(PORT, () => console.log(`The Public Brief API running on http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
