const mongoose = require('mongoose');

const revisionSchema = new mongoose.Schema(
  {
    refModel: { type: String, required: true },   // 'CmsSection' | 'Product' | 'Collection'
    refId: { type: mongoose.Schema.Types.ObjectId, required: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true }, // Full document snapshot
    version: { type: Number, required: true },
    label: { type: String },    // e.g. "Published 18 Jul 2026"
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Revision', revisionSchema);
