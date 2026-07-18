const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const AdminUser = require('../models/AdminUser');
const Category = require('../models/Category');
const Collection = require('../models/Collection');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Appointment = require('../models/Appointment');
const CmsSection = require('../models/CmsSection');
const { protect } = require('../middleware/auth');

// ── Directory scanner for products ───────────────────────────────────────────
function scanDirectory(dir, baseDir) {
  let results = [];
  if (!fs.existsSync(dir)) return [];
  
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(scanDirectory(fullPath, baseDir));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        const relativeFolder = path.relative(baseDir, dir).replace(/\\/g, '/');
        results.push({
          relativePath: path.relative(baseDir, fullPath).replace(/\\/g, '/'),
          name: path.basename(file, ext),
          folder: relativeFolder
        });
      }
    }
  });
  return results;
}

function getProductGroupKey(name) {
  let key = name.replace(/\s*\(\d+\)\s*/g, '');
  key = key.replace(/[-_](gallery|model|lifestyle|editorial|banner)[-_]?\d*/gi, '');
  return key.trim().toLowerCase();
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  try {
    const admin = await AdminUser.findOne({ email }).select('+password');
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    const token = admin.getSignedJwt();
    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
        permissions: admin.permissions,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Please provide current and new password' });
  }
  try {
    const admin = await AdminUser.findById(req.admin._id).select('+password');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/seed — Reads real files from public folders and seeds MongoDB
router.post('/seed', async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sana.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Sana@2025';

    // 1. Seed or Update AdminUser
    let admin = await AdminUser.findOne({ email: adminEmail });
    if (!admin) {
      admin = await AdminUser.create({
        name: 'Sana Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'super_admin',
        permissions: {
          products: true, collections: true, appointments: true, orders: true,
          customers: true, cms: true, media: true, seo: true, settings: true, users: true,
        },
      });
    } else {
      admin.password = adminPassword;
      await admin.save();
    }

    // 2. Seed default Categories
    const defaultCategories = [
      { name: 'Bridal', slug: 'bridal', order: 1, visible: true },
      { name: 'Festive', slug: 'festive', order: 2, visible: true },
      { name: 'Designer Suits', slug: 'designer-suits', order: 3, visible: true },
      { name: 'Cotton', slug: 'cotton', order: 4, visible: true },
      { name: 'Premium', slug: 'premium', order: 5, visible: true },
      { name: 'Printed', slug: 'printed', order: 6, visible: true },
      { name: 'Rayon', slug: 'rayon', order: 7, visible: true },
      { name: 'Lawn', slug: 'lawn', order: 8, visible: true },
      { name: 'Embroidery', slug: 'embroidery', order: 9, visible: true },
      { name: 'New Arrivals', slug: 'new-arrivals', order: 10, visible: true },
      { name: 'Best Sellers', slug: 'best-sellers', order: 11, visible: true },
    ];
    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate({ slug: cat.slug }, cat, { upsert: true, new: true });
    }

    // 3. Seed default Collections
    const defaultCollections = [
      { name: "Bridal Couture '25", slug: 'bridal-couture-25', season: 'Autumn', year: 2025, visible: true, status: 'published', order: 1 },
      { name: 'The Festive Edit', slug: 'the-festive-edit', season: 'Spring', year: 2026, visible: true, status: 'published', order: 2 },
      { name: 'Daily Luxury', slug: 'daily-luxury', season: 'Summer', year: 2026, visible: true, status: 'published', order: 3 },
    ];
    const collectionMap = {};
    for (const col of defaultCollections) {
      const dbCol = await Collection.findOneAndUpdate({ slug: col.slug }, col, { upsert: true, new: true });
      collectionMap[col.name] = dbCol._id;
    }

    // 4. Scan public folder and parse all 42 actual local products
    const publicDir = path.join(__dirname, '../../frontend/public');
    const productsDir = path.join(publicDir, 'images/products');
    const images = scanDirectory(productsDir, publicDir);

    const groups = {};
    images.forEach(img => {
      const groupKey = getProductGroupKey(img.name);
      if (img.name.startsWith('.')) return;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(img);
    });

    for (const [groupKey, imgList] of Object.entries(groups)) {
      imgList.sort((a, b) => {
        const aLower = a.name.toLowerCase();
        const bLower = b.name.toLowerCase();
        if (aLower.includes("copy") && !bLower.includes("copy")) return 1;
        if (!aLower.includes("copy") && bLower.includes("copy")) return -1;
        return aLower.localeCompare(bLower);
      });

      const primaryImg = imgList[0];
      const imagePath = `/` + primaryImg.relativePath;
      const galleryPaths = imgList.map(img => `/` + img.relativePath);
      const hash = groupKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const productCode = `D.NO-${100 + (hash % 900)}`;

      let title = "";
      const isGeneric = groupKey.startsWith("whatsapp image") || groupKey.startsWith("image copy") || groupKey === "image";
      if (isGeneric) {
        title = productCode;
      } else {
        title = groupKey.replace(/-\d+$/, '').split(/[-_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }

      const folderStr = primaryImg.folder.toLowerCase();
      const nameStr = primaryImg.name.toLowerCase();
      let category = "Designer Suits";
      if (folderStr.includes("bridal") || nameStr.includes("bridal") || nameStr.includes("wedding") || nameStr.includes("sharara")) {
        category = "Bridal";
      } else if (folderStr.includes("festive") || nameStr.includes("festive") || nameStr.includes("anarkali")) {
        category = "Festive";
      } else if (folderStr.includes("cotton") || nameStr.includes("cotton")) {
        category = "Cotton";
      } else if (folderStr.includes("premium") || nameStr.includes("premium")) {
        category = "Premium";
      } else if (folderStr.includes("printed") || nameStr.includes("printed")) {
        category = "Printed";
      } else if (folderStr.includes("rayon") || nameStr.includes("rayon")) {
        category = "Rayon";
      } else if (folderStr.includes("lawn") || nameStr.includes("lawn")) {
        category = "Lawn";
      } else if (folderStr.includes("embroidered") || nameStr.includes("embroidered") || nameStr.includes("embroidery")) {
        category = "Embroidery";
      } else if (folderStr.includes("new-arrivals") || nameStr.includes("new-arrivals")) {
        category = "New Arrivals";
      } else if (folderStr.includes("best-sellers") || nameStr.includes("best-sellers")) {
        category = "Best Sellers";
      }

      let fabric = "Raw Silk";
      if (nameStr.includes("cotton") || folderStr.includes("cotton")) fabric = "Cotton";
      else if (nameStr.includes("organza")) fabric = "Organza";
      else if (nameStr.includes("chiffon")) fabric = "Chiffon";
      else if (nameStr.includes("velvet")) fabric = "Velvet";
      else if (nameStr.includes("rayon")) fabric = "Rayon";
      else if (nameStr.includes("lawn")) fabric = "Lawn Cotton";
      else if (nameStr.includes("georgette")) fabric = "Georgette";
      else if (nameStr.includes("silk") || nameStr.includes("brocade")) fabric = "Banarasi Silk";

      let color = "Ivory Gold";
      if (nameStr.includes("red") || nameStr.includes("crimson")) color = "Crimson Red";
      else if (nameStr.includes("green") || nameStr.includes("emerald")) color = "Emerald Green";
      else if (nameStr.includes("blue") || nameStr.includes("indigo")) color = "Indigo Blue";
      else if (nameStr.includes("pink") || nameStr.includes("peach")) color = "Peach Pink";

      const collectionName = category === "Bridal" ? "Bridal Couture '25" : (category === "Festive" ? "The Festive Edit" : "Daily Luxury");
      const collectionId = collectionMap[collectionName];

      let price = 24000;
      if (category === "Bridal") price = 65000 + (hash % 20) * 1000;
      else if (category === "Premium") price = 52000 + (hash % 15) * 1000;
      else if (category === "Festive") price = 34000 + (hash % 10) * 1000;
      else if (category === "Cotton" || category === "Lawn" || category === "Rayon" || category === "Printed") {
        price = 12500 + (hash % 8) * 500;
      }

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const payload = {
        name: title,
        slug,
        sku: productCode,
        productCode,
        price,
        originalPrice: price * 1.25,
        description: `Premium ${title} designed for an elegant and effortless ethnic statement. Handcrafted in high-quality ${fabric} fabric.`,
        category,
        fabric,
        colors: [color],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom'],
        stock: 5 + (hash % 15),
        stockStatus: 'in_stock',
        images: galleryPaths,
        featured: hash % 4 === 0,
        trending: hash % 3 === 0,
        bestSeller: hash % 5 === 0,
        newArrival: hash % 4 === 1,
        collection: collectionId,
        status: 'published',
      };

      await Product.findOneAndUpdate({ slug }, payload, { upsert: true, new: true });
    }

    // 5. Seed default Customers
    const defaultCustomers = [
      { name: 'Aditi Sharma', email: 'aditi@gmail.com', phone: '+91 98200 12345', totalOrders: 1, totalSpend: 85000, notes: 'Bridal consultation candidate. Prefers traditional silks.' },
      { name: 'Rahul Khanna', email: 'rahul@yahoo.com', phone: '+91 98111 54321', totalOrders: 2, totalSpend: 36000, notes: 'Prefers classic casual wear' }
    ];
    for (const cust of defaultCustomers) {
      await Customer.findOneAndUpdate({ email: cust.email }, cust, { upsert: true });
    }

    // 6. Seed default Orders
    const defaultOrders = [
      {
        orderNumber: 'SANA-1001',
        customer: { name: 'Aditi Sharma', email: 'aditi@gmail.com', phone: '+91 98200 12345' },
        items: [{ productName: 'Royal Crimson Bridal Lehenga', quantity: 1, price: 85000 }],
        total: 85000,
        status: 'processing',
        paymentStatus: 'paid',
        shippingAddress: { line1: 'Sector 5, HSR Layout', city: 'Bengaluru', postalCode: '560102', country: 'India' },
        createdAt: new Date(),
      },
    ];
    for (const ord of defaultOrders) {
      await Order.findOneAndUpdate({ orderNumber: ord.orderNumber }, ord, { upsert: true });
    }

    // 7. Seed default Appointments
    const defaultAppointments = [
      { name: 'Prerna Kapoor', email: 'prerna@gmail.com', phone: '+91 98765 43210', date: new Date(Date.now() + 86400000 * 2), time: '11:00 AM', serviceType: 'Bridal Consultation', status: 'confirmed', notes: 'Fitting session for heavy zardozi wedding lehenga.' }
    ];
    for (const appt of defaultAppointments) {
      await Appointment.findOneAndUpdate({ email: appt.email }, appt, { upsert: true });
    }

    // 8. Seed default CMS sections
    const defaultCms = [
      { key: 'hero', sectionName: 'Main Hero Cover', order: 1, visible: true, status: 'published', title: 'ATELIER SANA FASHION', subtitle: 'GENRE-DEFINING COUTURE AND BRIDAL WEAR', body: 'Handcrafted luxury bridal wear built over hundreds of hours by generational karigars.', bgImage: '/images/models/hero_bridal.png', buttons: [{ label: 'Explore Couture', href: '/collections', variant: 'primary' }] },
      { key: 'about', sectionName: 'Brand Legacy Story', order: 2, visible: true, status: 'published', title: 'Generational Craftsmanship', subtitle: 'SINCE 1998', body: 'Every piece created in our design studio goes through detailed fitting sessions, textile testing, and master zardozi detailing, celebrating traditional heritage.', bgImage: '/images/products/wedding-sharara-1.jpg' }
    ];
    for (const block of defaultCms) {
      await CmsSection.findOneAndUpdate({ key: block.key }, block, { upsert: true });
    }

    res.json({
      success: true,
      message: 'Luxury demo catalog seeded successfully with local files!',
      credentials: { email: adminEmail, password: adminPassword },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
