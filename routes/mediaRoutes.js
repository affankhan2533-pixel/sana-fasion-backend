const express = require('express');
const router = express.Router();
const multer = require('multer');
const MediaAsset = require('../models/MediaAsset');
const { protect } = require('../middleware/auth');

// Setup multer (memory storage — upload to Cloudinary or save locally)
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

// Try to init Cloudinary if credentials exist
let cloudinary = null;
if (process.env.CLOUDINARY_CLOUD_NAME) {
  try {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  } catch (e) {
    console.warn('Cloudinary not configured — using local storage fallback');
  }
}

// GET all media assets
router.get('/', protect, async (req, res) => {
  try {
    const { folder, search, tags } = req.query;
    const filter = {};
    if (folder) filter.folder = folder;
    if (search) filter.filename = { $regex: search, $options: 'i' };
    if (tags) filter.tags = { $in: tags.split(',') };

    const assets = await MediaAsset.find(filter).sort({ createdAt: -1 }).populate('uploadedBy', 'name');
    res.json({ success: true, assets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST upload media
router.post('/upload', protect, upload.array('files', 20), async (req, res) => {
  try {
    const { folder = 'general', tags = '' } = req.body;
    const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const results = [];

    for (const file of req.files) {
      let url, cloudinaryId, width, height, format;

      if (cloudinary) {
        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: `sana-fashion/${folder}`, resource_type: 'auto', format: 'webp', quality: 'auto' },
            (err, result) => err ? reject(err) : resolve(result)
          ).end(file.buffer);
        });
        url = result.secure_url;
        cloudinaryId = result.public_id;
        width = result.width;
        height = result.height;
        format = result.format;
      } else {
        // Local fallback (store as base64 URL — dev only)
        const ext = file.originalname.split('.').pop();
        url = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        cloudinaryId = null;
        format = ext;
      }

      // Generate ALT text from filename
      const altText = file.originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      const asset = await MediaAsset.create({
        filename: file.originalname,
        originalName: file.originalname,
        url, cloudinaryId, folder,
        mimeType: file.mimetype,
        size: file.size,
        width, height, format,
        tags: tagList,
        altText,
        isVideo: file.mimetype.startsWith('video/'),
        uploadedBy: req.admin._id,
      });
      results.push(asset);
    }

    res.status(201).json({ success: true, assets: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH update asset (alt text, tags, folder)
router.patch('/:id', protect, async (req, res) => {
  try {
    const { altText, caption, tags, folder } = req.body;
    const update = {};
    if (altText !== undefined) update.altText = altText;
    if (caption !== undefined) update.caption = caption;
    if (tags !== undefined) update.tags = tags;
    if (folder !== undefined) update.folder = folder;

    const asset = await MediaAsset.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, asset });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE asset
router.delete('/:id', protect, async (req, res) => {
  try {
    const asset = await MediaAsset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    // Delete from Cloudinary if exists
    if (cloudinary && asset.cloudinaryId) {
      await cloudinary.uploader.destroy(asset.cloudinaryId, {
        resource_type: asset.isVideo ? 'video' : 'image',
      });
    }

    await asset.deleteOne();
    res.json({ success: true, message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE bulk
router.post('/bulk-delete', protect, async (req, res) => {
  try {
    const { ids } = req.body;
    const assets = await MediaAsset.find({ _id: { $in: ids } });

    if (cloudinary) {
      for (const a of assets) {
        if (a.cloudinaryId) await cloudinary.uploader.destroy(a.cloudinaryId);
      }
    }

    await MediaAsset.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: `${ids.length} assets deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
