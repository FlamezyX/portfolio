require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// ── helpers ──
if (!fs.existsSync(DATA_FILE)) {
  fs.copyFileSync(path.join(__dirname, 'data.example.json'), DATA_FILE);
}
const readData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// ── multer (photo upload) ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, 'photo' + path.extname(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ── auth middleware ──
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const SECRET = 'portfolio_jwt_secret_2026';

// ── routes ──

// GET /auth-status — check if admin account exists
app.get('/auth-status', (req, res) => {
  const data = readData();
  res.json({ hasAdmin: !!data.admin });
});

// POST /setup — create admin account (only works if no admin exists yet)
app.post('/setup', async (req, res) => {
  const data = readData();
  if (data.admin) return res.status(400).json({ error: 'Admin already exists' });
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const hash = await bcrypt.hash(password, 10);
  data.admin = { username, password: hash };
  writeData(data);
  const token = jwt.sign({ username }, SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// POST /login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const data = readData();
  if (!data.admin) return res.status(400).json({ error: 'No admin account found. Please set up first.' });
  if (username !== data.admin.username) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, data.admin.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username }, SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// GET /data — public, used by the portfolio frontend
app.get('/data', (req, res) => {
  res.json(readData());
});

// PUT /profile — update name, title, bio
app.put('/profile', auth, (req, res) => {
  const data = readData();
  data.profile = { ...data.profile, ...req.body };
  writeData(data);
  res.json(data.profile);
});

// POST /photo — upload profile photo
app.post('/photo', auth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const data = readData();
  data.profile.photo = `/uploads/${req.file.filename}`;
  writeData(data);
  res.json({ photo: data.profile.photo });
});

// PUT /links — update social links
app.put('/links', auth, (req, res) => {
  const data = readData();
  data.links = { ...data.links, ...req.body };
  writeData(data);
  res.json(data.links);
});

// POST /projects — add a new project
app.post('/projects', auth, (req, res) => {
  const data = readData();
  const project = { id: Date.now().toString(), ...req.body };
  data.projects.push(project);
  writeData(data);
  res.status(201).json(project);
});

// PUT /projects/:id — update a project
app.put('/projects/:id', auth, (req, res) => {
  const data = readData();
  const index = data.projects.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Project not found' });
  data.projects[index] = { ...data.projects[index], ...req.body };
  writeData(data);
  res.json(data.projects[index]);
});

// DELETE /projects/:id — remove a project
app.delete('/projects/:id', auth, (req, res) => {
  const data = readData();
  data.projects = data.projects.filter(p => p.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
