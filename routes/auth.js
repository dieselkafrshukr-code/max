const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const JWT_SECRET = process.env.JWT_SECRET || 'eltoufan-default-secret';

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password))
        return res.status(401).json({ error: 'بيانات الدخول غلط' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

router.get('/me', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT id, email, role, name FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
});

router.put('/change-password', authMiddleware, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password))
        return res.status(400).json({ error: 'كلمة المرور الحالية غلط' });
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
    res.json({ success: true });
});

router.get('/users', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
    const users = db.prepare('SELECT id, email, role, name FROM users').all();
    res.json(users);
});

router.put('/users/:id/password', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
    const { newPassword } = req.body;
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.params.id);
    res.json({ success: true });
});

module.exports = router;
