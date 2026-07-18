const express = require('express');
const router = express.Router();
const Collection = require('../models/Collection');
const { protect } = require('../middleware/auth');

// GET all collections
router.get('/', protect, async (req, res) => {
  try {
    const { search, status, visible } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (status) filter.status = status;
    if (visible !== undefined) filter.visible = visible === 'true';

    const collections = await Collection.find(filter).sort('order').populate('createdBy', 'name');
    res.json({ success: true, collections });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single collection
router.get('/:id', protect, async (req, res) => {
  try {
    const c = await Collection.findById(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Collection not found' });
    res.json({ success: true, collection: c });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create collection
router.post('/', protect, async (req, res) => {
  try {
    req.body.createdBy = req.admin._id;
    req.body.updatedBy = req.admin._id;
    const collection = await Collection.create(req.body);
    res.status(201).json({ success: true, collection });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update collection
router.put('/:id', protect, async (req, res) => {
  try {
    req.body.updatedBy = req.admin._id;
    const collection = await Collection.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });
    res.json({ success: true, collection });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE collection
router.delete('/:id', protect, async (req, res) => {
  try {
    await Collection.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Collection deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST reorder collections
router.post('/reorder', protect, async (req, res) => {
  try {
    const { orders } = req.body; // [{ id, order }]
    await Promise.all(orders.map(({ id, order }) =>
      Collection.findByIdAndUpdate(id, { order })
    ));
    res.json({ success: true, message: 'Order updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
