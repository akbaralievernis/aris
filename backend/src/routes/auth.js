import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config.js';

const router = express.Router();

const verifyPassword = async (password) => {
  if (config.adminPasswordHash) {
    return bcrypt.compare(password, config.adminPasswordHash);
  }
  if (!config.adminPassword) {
    return false;
  }
  return password === config.adminPassword;
};

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  if (username !== config.adminUser) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValid = await verifyPassword(password);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ sub: username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });

  return res.json({ token });
});

export default router;
