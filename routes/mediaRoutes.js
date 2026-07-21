const express = require('express');
const router = express.Router();
const multer = require('multer');
const MediaAsset = require('../models/MediaAsset');
const { protect } = require('../middleware/auth');

// Setup multer (memory storage with 10MB limit per file)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

// Init Cloudinary
let cloudinary = null;
if (process.env.CLOUDINARY_CLOUD_NAME) {
  try {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true, // Enforce HTTPS URLs
    });
    console.log(`[MEDIA] Cloudinary initialized successfully for cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  } catch (e) {
    console.error('[MEDIA ERROR] Failed to initialize Cloudinary:', e);
  }
} else {
  console.warn('[MEDIA WARNING] CLOUDINARY_CLOUD_NAME is not set. Uploads will require Cloudinary credentials.');
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
    if (!req.files || !req.files.length) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    if (!cloudinary) {
      console.error('[MEDIA UPLOAD ERROR] Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) missing on server.');
      return res.status(500).json({
        success: false,
        message: 'Cloudinary environment variables missing on server. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      });
    }

    const { folder = 'general', tags = '' } = req.body;
    const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const results = [];

    for (const file of req.files) {
      console.log(`[MEDIA UPLOAD] Uploading file: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB) to Cloudinary...`);

      // Upload directly to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `sana-fashion/${folder}`,
            resource_type: 'auto',
            secure: true,
          },
          (err, result) => {
            if (err) {
              console.error(`[CLOUDINARY STREAM ERROR] Failed uploading ${file.originalname}:`, err);
              return reject(err);
            }
            resolve(result);
          }
        ).end(file.buffer);
      });

      // Ensure URL uses HTTPS protocol exclusively
      const secureUrl = result.secure_url || result.url.replace(/^http:/, 'https:');

      // Generate ALT text from filename
      const altText = file.originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      const asset = await MediaAsset.create({
        filename: file.originalname,
        originalName: file.originalname,
        url: secureUrl,
        cloudinaryId: result.public_id,
        folder,
        mimeType: file.mimetype,
        size: file.size,
        width: result.width,
        height: result.height,
        format: result.format,
        tags: tagList,
        altText,
        isVideo: file.mimetype.startsWith('video/'),
        uploadedBy: req.admin?._id,
      });

      console.log(`[MEDIA UPLOAD SUCCESS] Uploaded asset ID: ${asset._id}, URL: ${secureUrl}`);
      results.push(asset);
    }

    res.status(201).json({ success: true, assets: results });
  } catch (err) {
    console.error('[PRODUCTION MEDIA UPLOAD ERROR]', {
      timestamp: new Date().toISOString(),
      message: err.message,
      stack: err.stack,
      user: req.admin?._id,
    });
    res.status(500).json({ success: false, message: `Image upload failed: ${err.message}` });
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
