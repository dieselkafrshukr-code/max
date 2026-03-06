const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM shipping_rates ORDER BY governorate').all());
});

router.put('/', authMiddleware, roleMiddleware('superadmin', 'store'), (req, res) => {
    const { id, price } = req.body;
    db.prepare('UPDATE shipping_rates SET price = ? WHERE id = ?').run(price, id);
    res.json({ success: true });
});

module.exports = router;
