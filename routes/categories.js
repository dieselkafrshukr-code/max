const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', (req, res) => {
    const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
    res.json(cats);
});

router.post('/', authMiddleware, roleMiddleware('superadmin', 'store'), (req, res) => {
    const { name_ar, name_en, parent_id, trade_type } = req.body;
    const result = db.prepare('INSERT INTO categories (name_ar, name_en, parent_id, trade_type) VALUES (?,?,?,?)').run(name_ar, name_en || name_ar, parent_id || null, trade_type || 'both');
    res.json({ id: result.lastInsertRowid, name_ar, name_en, parent_id, trade_type });
});

router.put('/:id', authMiddleware, roleMiddleware('superadmin', 'store'), (req, res) => {
    const { name_ar, name_en, trade_type } = req.body;
    db.prepare('UPDATE categories SET name_ar=?, name_en=?, trade_type=? WHERE id=?').run(name_ar, name_en, trade_type, req.params.id);
    res.json({ success: true });
});

router.delete('/:id', authMiddleware, roleMiddleware('superadmin', 'store'), (req, res) => {
    function deleteTree(id) {
        const children = db.prepare('SELECT id FROM categories WHERE parent_id = ?').all(id);
        for (const c of children) deleteTree(c.id);
        db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    }
    deleteTree(req.params.id);
    res.json({ success: true });
});

module.exports = router;
