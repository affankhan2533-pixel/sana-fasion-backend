const express = require('express');
const router = express.Router();
const CmsSection = require('../models/CmsSection');
const Revision = require('../models/Revision');
const { protect } = require('../middleware/auth');

// GET all sections (ordered)
router.get('/', protect, async (req, res) => {
  try {
    const sections = await CmsSection.find().sort('order');
    res.json({ success: true, sections });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single section by key
router.get('/:key', protect, async (req, res) => {
  try {
    const section = await CmsSection.findOne({ key: req.params.key });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    res.json({ success: true, section });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update / create section by key
router.put('/:key', protect, async (req, res) => {
  try {
    req.body.updatedBy = req.admin._id;
    const existing = await CmsSection.findOne({ key: req.params.key });

    // Save revision on publish
    if (existing && req.body.status === 'published') {
      const revCount = await Revision.countDocuments({ refId: existing._id });
      await Revision.create({
        refModel: 'CmsSection', refId: existing._id,
        snapshot: existing.toObject(), version: revCount + 1,
        label: `Published ${new Date().toLocaleDateString('en-IN')}`,
        createdBy: req.admin._id,
      });
      req.body.lastPublishedAt = new Date();
    }

    const section = await CmsSection.findOneAndUpdate(
      { key: req.params.key },
      { ...req.body, key: req.params.key },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, section });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST reorder sections
router.post('/reorder', protect, async (req, res) => {
  try {
    const { orders } = req.body; // [{ id, order }]
    await Promise.all(orders.map(({ id, order }) => CmsSection.findByIdAndUpdate(id, { order })));
    res.json({ success: true, message: 'Sections reordered' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH toggle visibility
router.patch('/:key/visibility', protect, async (req, res) => {
  try {
    const section = await CmsSection.findOneAndUpdate(
      { key: req.params.key },
      { visible: req.body.visible },
      { new: true }
    );
    res.json({ success: true, section });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET section revisions
router.get('/:key/revisions', protect, async (req, res) => {
  try {
    const section = await CmsSection.findOne({ key: req.params.key });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    const revisions = await Revision.find({ refId: section._id, refModel: 'CmsSection' })
      .sort({ version: -1 }).populate('createdBy', 'name');
    res.json({ success: true, revisions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST restore revision
router.post('/:key/restore/:revisionId', protect, async (req, res) => {
  try {
    const revision = await Revision.findById(req.params.revisionId);
    if (!revision) return res.status(404).json({ success: false, message: 'Revision not found' });

    const snap = { ...revision.snapshot };
    delete snap._id; delete snap.__v; delete snap.createdAt; delete snap.updatedAt;
    snap.updatedBy = req.admin._id;

    const section = await CmsSection.findOneAndUpdate({ key: req.params.key }, snap, { new: true });
    res.json({ success: true, section, message: 'Revision restored' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST seed default CMS sections
router.post('/seed', protect, async (req, res) => {
  try {
    const defaults = [
      { key: 'hero', sectionName: 'Hero Section', order: 1, status: 'published', visible: true, title: 'Where Heritage Meets Couture', subtitle: 'Luxury Ethnic Wear', body: 'Discover timeless elegance in every thread. Each piece is a love letter to Indian craftsmanship.', buttons: [{ label: 'Explore Collections', href: '/collections', variant: 'primary' }, { label: 'Book Consultation', href: '/contact', variant: 'secondary' }] },
      { key: 'brand-story', sectionName: 'Brand Story', order: 2, status: 'published', visible: true, title: 'A Legacy of Artistry', subtitle: 'Our Story', body: 'Founded in 2015, Sana Fashion is a luxury fashion house celebrating the artistry of Indian craftsmanship.' },
      { key: 'stats', sectionName: 'Statistics', order: 3, status: 'published', visible: true, stats: [{ label: 'Years of Heritage', value: '10+' }, { label: 'Happy Brides', value: '2,500+' }, { label: 'Master Artisans', value: '50+' }, { label: 'Collections', value: '200+' }] },
      { key: 'featured-collections', sectionName: 'Featured Collections', order: 4, status: 'published', visible: true, title: 'Our Collections', subtitle: 'Curated Selections' },
      { key: 'best-sellers', sectionName: 'Best Sellers', order: 5, status: 'published', visible: true, title: 'Most Loved', subtitle: 'Best Sellers' },
      { key: 'appointment-cta', sectionName: 'Appointment CTA', order: 6, status: 'published', visible: true, title: 'Visit Our Atelier', subtitle: 'Personal Styling', body: 'Book a private consultation with our design team.', buttons: [{ label: 'Book Appointment', href: '/contact', variant: 'primary' }] },
      { key: 'testimonials', sectionName: 'Testimonials', order: 7, status: 'published', visible: true, title: 'Beloved by Brides', subtitle: 'Reviews' },
      { key: 'instagram', sectionName: 'Instagram Gallery', order: 8, status: 'published', visible: true, title: 'Follow Our Journey', subtitle: '@sana___fashion___01' },
      { key: 'footer', sectionName: 'Footer', order: 99, status: 'published', visible: true, sectionType: 'footer', footerData: { address: 'Mumbai, Maharashtra, India', phone: '+91 90225 91620', email: 'hello@sanafashion.in', copyright: '© 2026 Sana Fashion. All rights reserved.' } },
      { key: 'navigation', sectionName: 'Navigation Menu', order: 0, status: 'published', visible: true, sectionType: 'navigation', navItems: [{ label: 'Home', href: '/', visible: true, order: 1 }, { label: 'Collections', href: '/collections', visible: true, order: 2 }, { label: 'Products', href: '/products', visible: true, order: 3 }, { label: 'Our Story', href: '/about', visible: true, order: 4 }, { label: 'Contact', href: '/contact', visible: true, order: 5 }] },
    ];

    for (const d of defaults) {
      await CmsSection.findOneAndUpdate({ key: d.key }, d, { upsert: true });
    }

    res.json({ success: true, message: `${defaults.length} CMS sections seeded` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
