require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = 'portfolio_jwt_secret_2026';
const UPLOADS_DIR = path.join(__dirname, 'uploads');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── MongoDB connection ──
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// ── Schemas ──
const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const portfolioSchema = new mongoose.Schema({
  profile: {
    name: { type: String, default: 'Benjamin Emmanuel' },
    title: { type: String, default: 'Data Analyst' },
    bio: { type: String, default: '' },
    photo: { type: String, default: '' },
  },
  links: {
    email: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
  },
  projects: { type: Array, default: [] },
});

const Admin = mongoose.model('Admin', adminSchema);
const Portfolio = mongoose.model('Portfolio', portfolioSchema);

// ── get or create the single portfolio document ──
async function getPortfolio() {
  let doc = await Portfolio.findOne();
  if (!doc) { doc = await Portfolio.create({}); }
  return doc;
}

// ── multer ──
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

// ── routes ──

app.get('/auth-status', async (req, res) => {
  const admin = await Admin.findOne();
  res.json({ hasAdmin: !!admin });
});

app.post('/setup', async (req, res) => {
  const existing = await Admin.findOne();
  if (existing) return res.status(400).json({ error: 'Admin already exists' });
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const hash = await bcrypt.hash(password, 10);
  await Admin.create({ username, password: hash });
  const token = jwt.sign({ username }, SECRET, { expiresIn: '8h' });
  res.json({ token });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne();
  if (!admin) return res.status(400).json({ error: 'No admin account found. Please set up first.' });
  if (username !== admin.username) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username }, SECRET, { expiresIn: '8h' });
  res.json({ token });
});

app.get('/data', async (req, res) => {
  const doc = await getPortfolio();
  res.json({ profile: doc.profile, links: doc.links, projects: doc.projects });
});

app.put('/profile', auth, async (req, res) => {
  const doc = await getPortfolio();
  Object.assign(doc.profile, req.body);
  doc.markModified('profile');
  await doc.save();
  res.json(doc.profile);
});

app.post('/photo', auth, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const doc = await getPortfolio();
  doc.profile.photo = `/uploads/${req.file.filename}`;
  doc.markModified('profile');
  await doc.save();
  res.json({ photo: doc.profile.photo });
});

app.put('/links', auth, async (req, res) => {
  const doc = await getPortfolio();
  Object.assign(doc.links, req.body);
  doc.markModified('links');
  await doc.save();
  res.json(doc.links);
});

app.post('/projects', auth, async (req, res) => {
  const doc = await getPortfolio();
  const project = { id: Date.now().toString(), ...req.body };
  doc.projects.push(project);
  doc.markModified('projects');
  await doc.save();
  res.status(201).json(project);
});

app.put('/projects/:id', auth, async (req, res) => {
  const doc = await getPortfolio();
  const index = doc.projects.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Project not found' });
  doc.projects[index] = { ...doc.projects[index], ...req.body };
  doc.markModified('projects');
  await doc.save();
  res.json(doc.projects[index]);
});

app.delete('/projects/:id', auth, async (req, res) => {
  const doc = await getPortfolio();
  doc.projects = doc.projects.filter(p => p.id !== req.params.id);
  doc.markModified('projects');
  await doc.save();
  res.json({ success: true });
});

app.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await Admin.findOne();
  const valid = await bcrypt.compare(currentPassword, admin.password);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
  admin.password = await bcrypt.hash(newPassword, 10);
  await admin.save();
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
