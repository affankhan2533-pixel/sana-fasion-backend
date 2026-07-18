const express = require('express');
const router = express.Router();
const AdminUser = require('../models/AdminUser');
const { protect, authorize } = require('../middleware/auth');

// GET all admin users
router.get('/', protect, authorize('super_admin', 'manager'), async (req, res) => {
  try {
    const users = await AdminUser.find().sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create admin user
router.post('/', protect, authorize('super_admin'), async (req, res) => {
  try {
    const user = await AdminUser.create(req.body);
    const { password, ...safe } = user.toObject();
    res.status(201).json({ success: true, user: safe });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update admin user
router.put('/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    if (req.body.password) delete req.body.password; // Use separate password change route
    const user = await AdminUser.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE admin user
router.delete('/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    if (req.params.id === req.admin._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }
    await AdminUser.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
