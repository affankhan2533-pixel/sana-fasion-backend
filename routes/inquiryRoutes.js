const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');

// POST submit inquiry
router.post('/', async (req, res) => {
  try {
    const inquiry = new Inquiry(req.body);
    await inquiry.save();
    res.status(201).json({ success: true, message: 'Your inquiry has been submitted. We will contact you within 24 hours.', inquiry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET all inquiries
router.get('/', async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json({ success: true, inquiries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
