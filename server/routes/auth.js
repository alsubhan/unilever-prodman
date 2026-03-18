const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const db = await getDb();
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = await db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } });
});

router.get('/me', require('../middleware/auth').authMiddleware, async (req, res) => {
  const db = await getDb();
  const user = await db.get('SELECT id, username, full_name, role, is_active, created_at FROM users WHERE id = ?', req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
