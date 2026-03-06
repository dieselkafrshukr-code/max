const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, roleMiddleware('superadmin', 'store'), (req, res) => {
    res.json(db.prepare('SELECT * FROM coupons ORDER BY id DESC').all());
});

router.post('/validate', (req, res) => {
    const { code, subtotal } = req.body;
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(code?.toUpperCase());
    if (!coupon) return res.status(404).json({ error: 'الكوبون غلط أو غير موجود' });
    if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) return res.status(400).json({ error: 'الكوبون انتهى' });
    const discount = coupon.type === 'percent' ? (subtotal * coupon.value / 100) : coupon.value;
    res.json({ valid: true, discount: Math.min(discount, subtotal), type: coupon.type, value: coupon.value });
});

router.post('/', authMiddleware, roleMiddleware('superadmin', 'store'), (req, res) => {
    const { code, type, value, max_uses, min_subtotal } = req.body;
    try {
        db.prepare('INSERT INTO coupons (code,type,value,max_uses,min_subtotal) VALUES (?,?,?,?,?)').run(code.toUpperCase(), type, value, max_uses || 0, min_subtotal || 0);
        res.json({ success: true });
    } catch { res.status(400).json({ error: 'الكود موجود بالفعل' }); }
});

router.delete('/:id', authMiddleware, roleMiddleware('superadmin', 'store'), (req, res) => {
    db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
