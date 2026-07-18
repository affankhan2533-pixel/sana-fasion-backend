const mongoose = require('mongoose');

const buttonSchema = new mongoose.Schema({
  label: { type: String },
  href: { type: String },
  variant: { type: String, enum: ['primary', 'secondary', 'ghost'], default: 'primary' },
  visible: { type: Boolean, default: true },
});

const cmsSectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },  // e.g. 'hero', 'brand-story', 'navigation', 'footer'
    sectionName: { type: String, required: true },         // Human-readable: "Hero Section"
    sectionType: { type: String, default: 'content' },     // 'content' | 'navigation' | 'footer'

    // Content fields
    title: { type: String },
    subtitle: { type: String },
    tagline: { type: String },
    body: { type: String },   // Rich text HTML

    // Media
    images: [{ type: String }],
    video: { type: String },
    backgroundImage: { type: String },
    altText: { type: String },

    // Buttons / Links
    buttons: [buttonSchema],
    links: [{ label: String, href: String, visible: Boolean }],

    // Appearance
    backgroundColor: { type: String },
    textColor: { type: String },
    accentColor: { type: String },
    layout: { type: String },    // 'left' | 'right' | 'center' | 'full'

    // Stats (for stats section)
    stats: [{ label: String, value: String, icon: String }],

    // Navigation (for menu builder)
    navItems: [{
      label: String,
      href: String,
      visible: { type: Boolean, default: true },
      order: Number,
      children: [{ label: String, href: String, visible: Boolean }],
    }],

    // Footer (for footer builder)
    footerData: { type: mongoose.Schema.Types.Mixed },

    // Visibility & order
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    // Publishing
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
    },
    publishAt: { type: Date },
    lastPublishedAt: { type: Date },

    // Tracking
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CmsSection', cmsSectionSchema);
