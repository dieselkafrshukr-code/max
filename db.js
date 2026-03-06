const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(process.env.DB_NAME || './eltoufan.db');

function initDB() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      parent_id INTEGER DEFAULT NULL,
      trade_type TEXT DEFAULT 'both',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      sku TEXT UNIQUE,
      price REAL NOT NULL,
      category_id INTEGER,
      description TEXT,
      main_image TEXT,
      sizes TEXT DEFAULT '[]',
      main_color_ar TEXT,
      main_color_en TEXT,
      variants TEXT DEFAULT '[]',
      hidden INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      phone2 TEXT,
      address TEXT NOT NULL,
      governorate TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      items TEXT NOT NULL,
      subtotal REAL,
      shipping_cost REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      coupon_code TEXT,
      total REAL NOT NULL,
      status TEXT DEFAULT 'new',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'percent',
      value REAL NOT NULL,
      max_uses INTEGER DEFAULT 0,
      used_count INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shipping_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      governorate TEXT UNIQUE NOT NULL,
      price REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

    // Default admin
    const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@eltoufan.com');
    if (!adminExists) {
        db.prepare('INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)').run('admin@eltoufan.com', bcrypt.hashSync(process.env.ADMIN_PASS || 'admin123', 10), 'superadmin', 'Super Admin');
        db.prepare('INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)').run('orders@eltoufan.com', bcrypt.hashSync('orders123', 10), 'orders', 'Orders Manager');
        db.prepare('INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)').run('store@eltoufan.com', bcrypt.hashSync('store123', 10), 'store', 'Store Manager');
    }

    // Default settings
    const defaultSettings = {
        whatsapp1: process.env.WHATSAPP || '201000000000',
        whatsapp2: '',
        announcement_text: '🌊 مرحباً بكم في الطوفان — أفضل الأسعار وأجود الخامات',
        announcement_active: 'true',
        maintenance_mode: 'false',
        maintenance_reason: '',
        maintenance_duration: '',
        maintenance_message: '',
        store_name: 'EL TOUFAN',
        whatsapp_template: 'طلب جديد من {customer}\nرقم الطلب: {id}\n{items}',
    };
    for (const [key, value] of Object.entries(defaultSettings)) {
        const exists = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
        if (!exists) db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }

    // Default shipping rates
    const govs = ['القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية', 'المنوفية', 'البحيرة', 'الغربية', 'كفر الشيخ', 'دمياط', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح', 'شمال سيناء', 'جنوب سيناء', 'بورسعيد', 'الإسماعيلية', 'السويس', 'قليوبية'];
    for (const gov of govs) {
        const exists = db.prepare('SELECT id FROM shipping_rates WHERE governorate = ?').get(gov);
        if (!exists) db.prepare('INSERT INTO shipping_rates (governorate, price) VALUES (?, ?)').run(gov, gov === 'بورسعيد' ? 0 : 60);
    }

    console.log('✅ Database initialized');
}

module.exports = { db, initDB };
