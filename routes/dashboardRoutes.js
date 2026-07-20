const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Appointment = require('../models/Appointment');
const Inquiry = require('../models/Inquiry');
const Collection = require('../models/Collection');
const Order = require('../models/Order');
const VisitorLog = require('../models/VisitorLog');
const { protect } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

    const [
      totalProducts, publishedProducts, draftProducts,
      totalCollections,
      pendingAppointments, todayAppointments,
      newInquiries,
      totalOrders, pendingOrders,
      lowStockProducts, outOfStockProducts,
      recentAppointments, recentInquiries,
      totalViews, todayViews, uniqueSessions,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: 'published' }),
      Product.countDocuments({ status: 'draft' }),
      Collection.countDocuments({ visible: true }),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({
        date: { $gte: todayStart, $lte: todayEnd },
      }),
      Inquiry.countDocuments({ status: 'new' }),
      Order.countDocuments(),
      Order.countDocuments({ paymentStatus: 'pending' }),
      Product.countDocuments({ stockStatus: 'low_stock' }),
      Product.countDocuments({ stockStatus: 'out_of_stock' }),
      Appointment.find().sort({ createdAt: -1 }).limit(5),
      Inquiry.find().sort({ createdAt: -1 }).limit(5),
      VisitorLog.countDocuments(),
      VisitorLog.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      VisitorLog.distinct('sessionHash'),
    ]);

    // Recent activity feed
    const recentActivity = [
      ...recentAppointments.map(a => ({
        type: 'appointment', icon: 'calendar', color: 'gold',
        message: `New appointment — ${a.name}`,
        sub: a.serviceType,
        time: a.createdAt,
        link: '/admin/appointments',
      })),
      ...recentInquiries.map(i => ({
        type: 'inquiry', icon: 'mail', color: 'blue',
        message: `New enquiry — ${i.name}`,
        sub: i.subject,
        time: i.createdAt,
        link: '/admin/appointments',
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    res.json({
      success: true,
      stats: {
        products: { total: totalProducts, published: publishedProducts, draft: draftProducts },
        collections: totalCollections,
        appointments: { pending: pendingAppointments, today: todayAppointments },
        inquiries: { new: newInquiries },
        orders: { total: totalOrders, pending: pendingOrders },
        inventory: { lowStock: lowStockProducts, outOfStock: outOfStockProducts },
        views: { total: totalViews, today: todayViews, unique: uniqueSessions.length },
      },
      recentActivity,
      upcomingAppointments: await Appointment.find({ status: 'pending' })
        .sort({ date: 1 }).limit(5),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
