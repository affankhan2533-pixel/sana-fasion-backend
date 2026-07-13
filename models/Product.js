const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    description: { type: String, required: true },
    shortDescription: { type: String },
    images: [{ type: String }],
    category: {
      type: String,
      required: true,
      enum: ['Wedding Collection', 'Festive Collection', 'Designer Suits', 'New Arrivals', 'Best Sellers'],
    },
    subcategory: { type: String },
    sizes: [{ type: String }],
    colors: [{ type: String }],
    fabric: { type: String },
    occasion: { type: String },
    featured: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: false },
    inStock: { type: Boolean, default: true },
    tags: [{ type: String }],
    rating: { type: Number, default: 5, min: 1, max: 5 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
