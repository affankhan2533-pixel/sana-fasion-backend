const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['new_appointment', 'new_inquiry', 'low_stock', 'out_of_stock', 'upload_failed', 'seo_missing', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String },
    link: { type: String },
    refModel: { type: String },
    refId: { type: mongoose.Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
