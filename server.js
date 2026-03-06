require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./db');

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const couponRoutes = require('./routes/coupons');
const shippingRoutes = require('./routes/shipping');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;

// Determine uploads directory (persistent disk on Render, local otherwise)
const UPLOADS_DIR = process.env.NODE_ENV === 'production'
    ? '/data/uploads'
    : path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Make uploads dir available globally for routes
process.env.UPLOADS_DIR = UPLOADS_DIR;

// Init DB
initDB();

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', db: 'sqlite', version: '1.2.0', env: process.env.NODE_ENV }));

// Static files (for production)
app.use(express.static(__dirname));

app.listen(PORT, () => console.log(`🌊 EL TOUFAN Server running on http://localhost:${PORT}`));
