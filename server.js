const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const app = express();

// Cho phép GitHub Pages và các origin khác gọi API
app.use((req, res, next) => {
  const allowed = [
    'https://exorcisthb.github.io',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ];
  const origin = req.headers.origin;
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'rophim.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    avatar TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const saved = Buffer.from(hash, 'hex');
  return saved.length === candidate.length && crypto.timingSafeEqual(saved, candidate);
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, avatar: user.avatar, role: user.role };
}

app.use(express.json());

app.post('/api/auth/register', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
    return res.status(400).json({ message: 'Thông tin đăng ký không hợp lệ.' });
  }

  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e50914&color=fff&bold=true`;
  try {
    const result = db.prepare('INSERT INTO users (name, email, password_hash, avatar) VALUES (?, ?, ?, ?)')
      .run(name, email, hashPassword(password), avatar);
    const user = db.prepare('SELECT id, name, email, avatar, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 'ERR_SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Email này đã được đăng ký.' });
    }
    console.error('Không thể đăng ký tài khoản:', error);
    return res.status(500).json({ message: 'Không thể tạo tài khoản. Vui lòng thử lại.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
  }
  return res.json({ user: publicUser(user) });
});

// Serve static files from project root
app.use(express.static(path.join(__dirname)));

// Handle SPA routing - all routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`RoPhim Cinema server running on port ${PORT}`);
});
