const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  label: { type: String },        // e.g. "Red / M"
  color: { type: String },
  size: { type: String },
  fabric: { type: String },
  sku: { type: String },
  price: { type: Number },        // override price (null = use product price)
  salePrice: { type: Number },
  stock: { type: Number, default: 0 },
});

const productSchema = new mongoose.Schema(
  {
    // Core
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    sku: { type: String },
    productCode: { type: String },

    // Pricing
    price: { type: Number, required: true },
    salePrice: { type: Number },
    originalPrice: { type: Number },

    // Descriptions
    description: { type: String, required: true },
    shortDescription: { type: String },
    story: { type: String },
    careInstructions: { type: String },
    shippingInfo: { type: String },
    returnPolicy: { type: String },

    // Categorisation
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subcategory: { type: String },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection' },

    // Attributes
    sizes: [{ type: String }],
    colors: [{ type: String }],
    fabric: { type: String },
    occasion: { type: String },
    embroidery: { type: String },
    workType: { type: String },

    // Inventory
    stock: { type: Number, default: 0 },
    stockStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock',
    },
    variants: [variantSchema],

    // Flags
    featured: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },
    limitedEdition: { type: Boolean, default: false },
    madeToOrder: { type: Boolean, default: false },

    // Media
    images: [{ type: String }],
    videos: [{ type: String }],

    // Relations
    relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    recommendedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

    // Publishing
    status: {
      type: String,
      enum: ['draft', 'published', 'archived', 'scheduled'],
      default: 'draft',
    },
    publishAt: { type: Date },

    // SEO
    seoTitle: { type: String },
    seoDescription: { type: String },
    seoKeywords: [{ type: String }],
    ogImage: { type: String },

    // Tags & Meta
    tags: [{ type: String }],
    rating: { type: Number, default: 5, min: 1, max: 5 },
    reviewCount: { type: Number, default: 0 },

    // Admin tracking
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);

// Auto-set stockStatus based on stock count
productSchema.pre('save', function (next) {
  if (this.stock === 0) this.stockStatus = 'out_of_stock';
  else if (this.stock <= 5) this.stockStatus = 'low_stock';
  else this.stockStatus = 'in_stock';
  next();
});

module.exports = mongoose.model('Product', productSchema);
