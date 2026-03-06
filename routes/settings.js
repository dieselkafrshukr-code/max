const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', (req, res) => {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
});

router.put('/', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(req.body)) stmt.run(key, String(value));
    res.json({ success: true });
});

module.exports = router;
