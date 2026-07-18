const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String },
    url: { type: String, required: true },
    cloudinaryId: { type: String },
    folder: { type: String, default: 'general' },
    mimeType: { type: String },
    size: { type: Number },           // bytes
    width: { type: Number },
    height: { type: Number },
    format: { type: String },         // webp, jpg, mp4, etc.
    tags: [{ type: String }],
    altText: { type: String },
    caption: { type: String },
    isVideo: { type: Boolean, default: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MediaAsset', mediaSchema);
