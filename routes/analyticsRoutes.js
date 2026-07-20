const express = require('express');
const router = express.Router();
const VisitorLog = require('../models/VisitorLog');
const { protect } = require('../middleware/auth');

// POST /api/analytics/track — Public endpoint to log website visitor page view
router.post('/track', async (req, res) => {
  try {
    const { path = '/' } = req.body;
    // Don't track admin routes
    if (path.startsWith('/admin') || path.startsWith('/api')) {
      return res.json({ success: true, tracked: false });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';
    const sessionHash = `${ip}-${userAgent.slice(0, 30)}`;

    await VisitorLog.create({
      path,
      ip,
      userAgent,
      sessionHash,
    });

    res.json({ success: true, tracked: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analytics/stats — Protected endpoint for admin dashboard
router.get('/stats', protect, async (req, res) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

    const [totalViews, todayViews, uniqueSessions] = await Promise.all([
      VisitorLog.countDocuments(),
      VisitorLog.countDocuments({
        createdAt: { $gte: todayStart, $lte: todayEnd },
      }),
      VisitorLog.distinct('sessionHash'),
    ]);

    res.json({
      success: true,
      stats: {
        totalViews,
        todayViews,
        uniqueVisitors: uniqueSessions.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
