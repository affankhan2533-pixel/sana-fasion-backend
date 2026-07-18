const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const adminUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ['super_admin', 'manager', 'editor', 'photographer', 'support'],
      default: 'editor',
    },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    permissions: {
      products: { type: Boolean, default: true },
      collections: { type: Boolean, default: true },
      appointments: { type: Boolean, default: true },
      orders: { type: Boolean, default: false },
      customers: { type: Boolean, default: false },
      cms: { type: Boolean, default: false },
      media: { type: Boolean, default: true },
      seo: { type: Boolean, default: false },
      settings: { type: Boolean, default: false },
      users: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Hash password before save
adminUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
adminUserSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

// Generate JWT
adminUserSchema.methods.getSignedJwt = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

module.exports = mongoose.model('AdminUser', adminUserSchema);
