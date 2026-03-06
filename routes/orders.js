const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const Joi = require('joi');
const sseClients = new Set();

const orderSchema = Joi.object({
    customer_name: Joi.string().min(3).required(),
    phone: Joi.string().pattern(/^\d{10,15}$/).required(),
    phone2: Joi.string().allow(null, ''),
    address: Joi.string().min(10).required(),
    governorate: Joi.string().required(),
    payment_method: Joi.string().valid('cash', 'online'),
    items: Joi.array().min(1).required(),
    subtotal: Joi.number().required(),
    shipping_cost: Joi.number().required(),
    discount: Joi.number().optional(),
    coupon_code: Joi.string().allow(null, ''),
    total: Joi.number().required(),
    notes: Joi.string().allow(null, '')
});

function generateOrderNumber() {
    const now = new Date();
    return `TUF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000) + 1000}`;
}

router.get('/stream', authMiddleware, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*' });
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
});

router.post('/', (req, res) => {
    const { error } = orderSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { customer_name, phone, phone2, address, governorate, payment_method, items, subtotal, shipping_cost, discount, coupon_code, total, notes } = req.body;
    const order_number = generateOrderNumber();
    db.prepare('INSERT INTO orders (order_number,customer_name,phone,phone2,address,governorate,payment_method,items,subtotal,shipping_cost,discount,coupon_code,total,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(order_number, customer_name, phone, phone2 || null, address, governorate, payment_method || 'cash', JSON.stringify(items), subtotal || 0, shipping_cost || 0, discount || 0, coupon_code || null, total, notes || null);
    if (coupon_code) db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?').run(coupon_code);

    // Notify SSE
    for (const client of sseClients) client.write(`data: ${JSON.stringify({ type: 'new_order', order_number })}\n\n`);

    res.json({ success: true, order_number });
});

router.get('/', authMiddleware, (req, res) => {
    const { search, status, limit, offset } = req.query;
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    if (search) { sql += ' AND (customer_name LIKE ? OR phone LIKE ? OR order_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    if (limit) { sql += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset) || 0}`; }
    const orders = db.prepare(sql).all(...params);
    res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items || '[]') })));
});

router.get('/stats', authMiddleware, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    // Status counts
    const counts = {
        pending: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending' OR status = 'new'").get().c,
        processing: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'processing'").get().c,
        shipped: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'shipped'").get().c,
        delivered: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'delivered'").get().c,
        cancelled: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'cancelled'").get().c
    };

    const periods = {
        daily: db.prepare(`SELECT COALESCE(SUM(total),0) as revenue FROM orders WHERE date(created_at) = ?`).get(today).revenue,
        weekly: db.prepare(`SELECT COALESCE(SUM(total),0) as revenue FROM orders WHERE date(created_at) >= ?`).get(weekAgo).revenue,
        monthly: db.prepare(`SELECT COALESCE(SUM(total),0) as revenue FROM orders WHERE date(created_at) >= ?`).get(monthAgo).revenue
    };

    res.json({ counts, periods });
});

router.patch('/:id/status', authMiddleware, (req, res) => {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
    res.json({ success: true });
});

router.delete('/:id', authMiddleware, roleMiddleware('superadmin', 'orders'), (req, res) => {
    db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
