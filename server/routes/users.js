const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET all users
router.get('/', authMiddleware, requireRole('admin', 'production_manager'), async (req, res) => {
  const db = await getDb();
  const users = await db.all('SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC', );
  res.json(users);
});

// POST create user
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  const { username, password, full_name, role } = req.body;
  if (!username || !password || !full_name || !role) return res.status(400).json({ error: 'All fields required' });
  const validRoles = ['admin', 'production_manager', 'operator', 'viewer'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = await db.run('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)', username, hash, full_name, role);
    res.status(201).json({ id: result.lastID, username, full_name, role, is_active: 1 });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already exists' });
    throw e;
  }
});

// GET single user
router.get('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  const user = await db.get('SELECT id, username, full_name, role, is_active, created_at FROM users WHERE id = ?', req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// PUT update user
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  const { full_name, role, is_active, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE id = ?', req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const newHash = password ? bcrypt.hashSync(password, 10) : user.password_hash;
  await db.run(`UPDATE users SET full_name=?, role=?, is_active=?, password_hash=?, updated_at=datetime('now') WHERE id=?`,
    full_name ?? user.full_name, role ?? user.role, is_active ?? user.is_active, newHash, req.params.id);
  res.json({ success: true });
});

// DELETE user
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  await db.run('DELETE FROM users WHERE id = ?', req.params.id);
  res.json({ success: true });
});

module.exports = router;
