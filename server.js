require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// ── Public routes ───────────────────────────────────────────────────────────
const productRoutes = require('./routes/productRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');

// ── Admin routes ────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminProductRoutes = require('./routes/adminProductRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const customerRoutes = require('./routes/customerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cmsRoutes = require('./routes/cmsRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth', authLimiter);

// ── Public API routes ───────────────────────────────────────────────────────
app.use('/api/products', productRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/inquiries', inquiryRoutes);

// ── Admin API routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/collections', collectionRoutes);
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/customers', customerRoutes);
app.use('/api/admin/orders', orderRoutes);
app.use('/api/admin/cms', cmsRoutes);
app.use('/api/admin/media', mediaRoutes);
app.use('/api/admin/users', adminUserRoutes);
// Appointments & inquiries re-use existing routes (admin can see all)

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '✨ Sana Fashion API is running', timestamp: new Date().toISOString() });
});

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`✨ Sana Fashion Server running on http://localhost:${PORT}`);
  console.log(`   Admin API ready at http://localhost:${PORT}/api/auth/seed`);
});

module.exports = app;
