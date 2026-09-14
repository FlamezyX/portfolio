# Benjamin Emmanuel — Data Analyst Portfolio

A full-stack portfolio website with an admin dashboard to manage projects, profile, and contact links.

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript — deployed on Vercel
- **Backend:** Node.js, Express — deployed on Render

## Project Structure
```
Portfolio/
├── frontend/
│   ├── index.html      # Portfolio site
│   ├── admin.html      # Admin dashboard
│   └── style.css
└── backend/
    ├── server.js       # Express API
    ├── data.example.json
    └── package.json
```

## Running Locally

**Backend:**
```bash
cd backend
cp data.example.json data.json
npm install
node server.js
```

**Frontend:**
```bash
cd frontend
http-server -p 3000
```

Then open `http://localhost:3000/admin.html` to set up your admin account.

## Deployment
- Frontend → [Vercel](https://vercel.com)
- Backend → [Render](https://render.com)

After deploying the backend, update the `API` variable in `frontend/index.html` and `frontend/admin.html` from `http://localhost:5000` to your Render URL.
