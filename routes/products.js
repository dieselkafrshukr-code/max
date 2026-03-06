const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const { db } = require('../db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', (req, res) => {
    const { category_id, hidden, search } = req.query;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    if (category_id) { sql += ' AND category_id = ?'; params.push(category_id); }
    if (hidden === undefined || hidden === 'false') { sql += ' AND hidden = 0'; }
    if (search) { sql += ' AND (name_ar LIKE ? OR name_en LIKE ? OR sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY id DESC';
    const products = db.prepare(sql).all(...params);
    res.json(products.map(p => ({ ...p, sizes: JSON.parse(p.sizes || '[]'), variants: JSON.parse(p.variants || '[]') })));
});

router.get('/:id', (req, res) => {
    const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ ...p, sizes: JSON.parse(p.sizes || '[]'), variants: JSON.parse(p.variants || '[]') });
});

router.post('/upload', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
        const filename = `img_${Date.now()}.jpg`;
        await sharp(req.file.buffer).resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 60 }).toFile(`./uploads/${filename}`);
        res.json({ url: `/uploads/${filename}`, path: `/uploads/${filename}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authMiddleware, roleMiddleware('superadmin', 'store'), (req, res) => {
    const { name_ar, name_en, price, category_id, description, main_image, sizes, main_color_ar, main_color_en, variants } = req.body;
    const last = db.prepare('SELECT sku FROM products ORDER BY id DESC LIMIT 1').get();
    let nextNum = 1;
    if (last?.sku) { const n = parseInt(last.sku.replace('TUF-', '')); if (!isNaN(n)) nextNum = n + 1; }
    const sku = `TUF-${String(nextNum).padStart(3, '0')}`;
    const result = db.prepare('INSERT INTO products (name_ar,name_en,sku,price,category_id,description,main_image,sizes,main_color_ar,main_color_en,variants) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(name_ar, name_en, sku, price, category_id, description, main_image || null, JSON.stringify(sizes || []), main_color_ar, main_color_en, JSON.stringify(variants || []));
    res.json({ id: result.lastInsertRowid, sku });
});

router.put('/:id', authMiddleware, roleMiddleware('superadmin', 'store'), (req, res) => {
    const { name_ar, name_en, price, category_id, description, main_image, sizes, main_color_ar, main_color_en, variants, hidden } = req.body;
    db.prepare('UPDATE products SET name_ar=?,name_en=?,price=?,category_id=?,description=?,main_image=?,sizes=?,main_color_ar=?,main_color_en=?,variants=?,hidden=? WHERE id=?').run(name_ar, name_en, price, category_id, description, main_image, JSON.stringify(sizes || []), main_color_ar, main_color_en, JSON.stringify(variants || []), hidden ? 1 : 0, req.params.id);
    res.json({ success: true });
});

router.patch('/:id/toggle', authMiddleware, roleMiddleware('superadmin', 'store'), (req, res) => {
    const p = db.prepare('SELECT hidden FROM products WHERE id = ?').get(req.params.id);
    db.prepare('UPDATE products SET hidden = ? WHERE id = ?').run(p.hidden ? 0 : 1, req.params.id);
    res.json({ hidden: !p.hidden });
});

router.delete('/:id', authMiddleware, roleMiddleware('superadmin', 'store'), (req, res) => {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
