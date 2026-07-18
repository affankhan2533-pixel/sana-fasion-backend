const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String },
  sku: { type: String },
  quantity: { type: Number, default: 1 },
  price: { type: Number },
  size: { type: String },
  color: { type: String },
  image: { type: String },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
    },
    items: [orderItemSchema],
    subtotal: { type: Number },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    shippingAddress: {
      line1: String, line2: String, city: String, state: String, pincode: String, country: String,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: { type: String },
    shippingStatus: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'],
      default: 'pending',
    },
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    notes: { type: String },
    source: { type: String, default: 'website' },
  },
  { timestamps: true }
);

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `SANA-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
