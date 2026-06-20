# The Public Brief

A full MERN stack publishing website where members register first, then publish articles on any topic.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + bcrypt
- Uploads: Multer image uploads

## Run Locally

MongoDB must be running locally on `mongodb://127.0.0.1:27017/the-public-brief`.

```powershell
cd backend
npm install
npm start
```

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

The API runs on:

```text
http://localhost:5000
```

## Production environment

Set these environment variables in the deployment dashboards. Do not commit
production secrets to the repository.

Frontend (Vercel):

```text
VITE_API_URL=https://your-render-service.onrender.com
```

Backend (Render):

```text
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
CLIENT_URL=https://www.thepublicbrief.in,https://thepublicbrief.in
```

Redeploy both services after changing their environment variables. The frontend
production build intentionally has no localhost fallback.

## Main Features

- Member registration with profile image, title, bio, and social links
- Member login with JWT authentication
- Protected writer studio for publishing articles
- Featured image uploads for articles
- Public home page, author directory, author profile pages, article pages, about, and contact
- Editorial design inspired by classic public affairs journals
