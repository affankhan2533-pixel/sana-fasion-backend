const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Revision = require('../models/Revision');
const { protect } = require('../middleware/auth');

// GET /api/admin/products — list with filters, sort, pagination
router.get('/', protect, async (req, res) => {
  try {
    const {
      search, category, status, stockStatus,
      featured, trending, newArrival, bestSeller,
      sort = '-createdAt', page = 1, limit = 20,
    } = req.query;

    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (stockStatus) filter.stockStatus = stockStatus;
    if (featured === 'true') filter.featured = true;
    if (trending === 'true') filter.trending = true;
    if (newArrival === 'true') filter.newArrival = true;
    if (bestSeller === 'true') filter.bestSeller = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter).sort(sort).skip(skip).limit(parseInt(limit))
        .populate('collection', 'name'),
    ]);

    res.json({ success: true, total, page: parseInt(page), products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/products/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('collection', 'name slug');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/products
router.post('/', protect, async (req, res) => {
  try {
    req.body.createdBy = req.admin._id;
    req.body.updatedBy = req.admin._id;
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/products/:id
router.put('/:id', protect, async (req, res) => {
  try {
    req.body.updatedBy = req.admin._id;

    // Save revision before update
    const existing = await Product.findById(req.params.id);
    if (existing && req.body.status === 'published') {
      const revCount = await Revision.countDocuments({ refId: req.params.id });
      await Revision.create({
        refModel: 'Product', refId: req.params.id,
        snapshot: existing.toObject(),
        version: revCount + 1,
        label: `Version ${revCount + 1} — ${new Date().toLocaleDateString('en-IN')}`,
        createdBy: req.admin._id,
      });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/products/:id/quick-edit — inline edit
router.patch('/:id/quick-edit', protect, async (req, res) => {
  try {
    const allowed = ['price', 'salePrice', 'stock', 'stockStatus', 'status', 'featured', 'trending', 'newArrival', 'bestSeller'];
    const update = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    update.updatedBy = req.admin._id;

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/products/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/products/bulk — bulk actions
router.post('/bulk', protect, async (req, res) => {
  try {
    const { ids, action, value } = req.body;
    if (!ids?.length) return res.status(400).json({ success: false, message: 'No products selected' });

    let update = {};
    if (action === 'publish') update.status = 'published';
    else if (action === 'archive') update.status = 'archived';
    else if (action === 'draft') update.status = 'draft';
    else if (action === 'update_stock') update.stock = parseInt(value);
    else if (action === 'update_price') update.price = parseFloat(value);
    else if (action === 'move_collection') update.collection = value;
    else if (action === 'move_category') update.category = value;
    else if (action === 'delete') {
      await Product.deleteMany({ _id: { $in: ids } });
      return res.json({ success: true, message: `${ids.length} products deleted` });
    }

    update.updatedBy = req.admin._id;
    const result = await Product.updateMany({ _id: { $in: ids } }, update);
    res.json({ success: true, message: `${result.modifiedCount} products updated` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/products/:id/duplicate
router.post('/:id/duplicate', protect, async (req, res) => {
  try {
    const original = await Product.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ success: false, message: 'Product not found' });

    delete original._id;
    original.name = `${original.name} (Copy)`;
    original.slug = `${original.slug}-copy-${Date.now()}`;
    original.status = 'draft';
    original.createdBy = req.admin._id;
    original.updatedBy = req.admin._id;

    const product = await Product.create(original);
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/admin/products/:id/revisions
router.get('/:id/revisions', protect, async (req, res) => {
  try {
    const revisions = await Revision.find({ refId: req.params.id, refModel: 'Product' })
      .sort({ version: -1 }).populate('createdBy', 'name');
    res.json({ success: true, revisions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/products/:id/restore/:revisionId
router.post('/:id/restore/:revisionId', protect, async (req, res) => {
  try {
    const revision = await Revision.findById(req.params.revisionId);
    if (!revision) return res.status(404).json({ success: false, message: 'Revision not found' });

    const snap = { ...revision.snapshot };
    delete snap._id; delete snap.__v; delete snap.createdAt; delete snap.updatedAt;
    snap.updatedBy = req.admin._id;

    const product = await Product.findByIdAndUpdate(req.params.id, snap, { new: true });
    res.json({ success: true, product, message: 'Revision restored' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/products/ai/generate — AI product content generation
router.post('/ai/generate', protect, async (req, res) => {
  try {
    const { name, price, fabric, category, occasion, colors } = req.body;

    // Luxury template-based generation (works without OpenAI key)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const fabricDisplay = fabric || 'premium fabric';
    const occasionDisplay = occasion || 'special occasions';
    const categoryDisplay = category || 'luxury ethnic wear';
    const colorDisplay = colors?.join(' and ') || 'rich tones';

    const description = `An exquisite ${name.toLowerCase()} crafted from the finest ${fabricDisplay}, designed to celebrate the artistry of Indian craftsmanship. Adorned with intricate embroidery and meticulous detailing, this piece embodies timeless elegance for ${occasionDisplay}. The ${colorDisplay} palette is thoughtfully chosen to complement every skin tone, making it a cherished addition to your wardrobe.`;

    const story = `Every thread in this ${name.toLowerCase()} tells a story of heritage and craftsmanship. Handcrafted by master artisans who have perfected their craft over generations, this piece is more than just clothing — it is wearable art. Inspired by the grandeur of Indian royalty and the delicacy of traditional motifs, it carries the essence of a timeless legacy.`;

    const seoTitle = `${name} — Luxury ${categoryDisplay} | Sana Fashion`;
    const seoDescription = `Shop the exquisite ${name} at Sana Fashion. Crafted from ${fabricDisplay} with intricate embroidery, perfect for ${occasionDisplay}. Free consultation available.`;
    const tags = [
      slug.replace(/-/g, ' '),
      fabric?.toLowerCase(),
      occasion?.toLowerCase(),
      category?.toLowerCase().split(' ')[0],
      'luxury', 'ethnic wear', 'sana fashion',
    ].filter(Boolean);

    res.json({
      success: true,
      generated: { description, story, seoTitle, seoDescription, slug, tags },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
