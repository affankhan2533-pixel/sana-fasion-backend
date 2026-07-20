const mongoose = require('mongoose');

const visitorLogSchema = new mongoose.Schema(
  {
    path: { type: String, default: '/' },
    ip: { type: String },
    userAgent: { type: String },
    sessionHash: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VisitorLog', visitorLogSchema);
