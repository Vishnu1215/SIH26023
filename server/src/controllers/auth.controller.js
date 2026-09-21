import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

// Mock user definition as per Phase 2 requirements
const MOCK_USER = {
  id: 'usr_001',
  username: 'admin',
  password: 'admin123',
  name: 'System Administrator',
  role: 'Admin',
  subsidiary: 'ALL'
};

export const login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  if (username !== MOCK_USER.username || password !== MOCK_USER.password) {
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }

  // Payload conforming to PRD RBAC design
  const payload = {
    id: MOCK_USER.id,
    username: MOCK_USER.username,
    name: MOCK_USER.name,
    role: MOCK_USER.role,
    subsidiary: MOCK_USER.subsidiary
  };

  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    user: payload
  });
};

export const getMe = (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user
  });
};
