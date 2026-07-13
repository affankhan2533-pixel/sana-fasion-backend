const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET all products
router.get('/', async (req, res) => {
  try {
    const { category, featured, bestSeller, newArrival, limit = 20, page = 1 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (bestSeller === 'true') filter.bestSeller = true;
    if (newArrival === 'true') filter.newArrival = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });

    res.json({ success: true, total, page: parseInt(page), products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single product by slug
router.get('/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create product (admin/seed use)
router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST seed sample products
router.post('/seed/all', async (req, res) => {
  try {
    await Product.deleteMany({});
    const sampleProducts = [
      {
        name: 'Royal Crimson Bridal Lehenga',
        slug: 'royal-crimson-bridal-lehenga',
        price: 85000,
        originalPrice: 110000,
        description: 'An exquisite bridal lehenga crafted from the finest Banarasi silk, adorned with hand-embroidered zardozi work and intricate gold thread detailing. Perfect for your dream wedding day.',
        shortDescription: 'Hand-embroidered Banarasi silk bridal lehenga with zardozi detailing',
        images: ['/images/products/bridal-lehenga-1.jpg'],
        category: 'Wedding Collection',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom'],
        colors: ['Crimson Red', 'Ivory Gold'],
        fabric: 'Banarasi Silk',
        occasion: 'Bridal',
        featured: true,
        bestSeller: true,
        rating: 5,
        reviewCount: 42,
        tags: ['bridal', 'lehenga', 'silk', 'wedding'],
      },
      {
        name: 'Ivory Pearl Wedding Sharara',
        slug: 'ivory-pearl-wedding-sharara',
        price: 62000,
        originalPrice: 78000,
        description: 'A magnificent ivory sharara set adorned with delicate pearl embellishments and resham embroidery, epitomizing timeless bridal elegance.',
        shortDescription: 'Pearl-embellished ivory sharara set with resham embroidery',
        images: ['/images/products/wedding-sharara-1.jpg'],
        category: 'Wedding Collection',
        sizes: ['S', 'M', 'L', 'XL', 'Custom'],
        colors: ['Ivory', 'Off-White'],
        fabric: 'Georgette',
        occasion: 'Wedding',
        featured: true,
        bestSeller: false,
        rating: 4.9,
        reviewCount: 28,
        tags: ['sharara', 'wedding', 'ivory', 'pearl'],
      },
      {
        name: 'Emerald Festive Anarkali',
        slug: 'emerald-festive-anarkali',
        price: 38000,
        originalPrice: 48000,
        description: 'A breathtaking emerald green Anarkali suit featuring mirror work, gota patti borders, and flowing chiffon dupatta — perfect for festive celebrations.',
        shortDescription: 'Mirror-work emerald Anarkali with flowing chiffon dupatta',
        images: ['/images/products/festive-anarkali-1.jpg'],
        category: 'Festive Collection',
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Emerald Green', 'Bottle Green'],
        fabric: 'Velvet & Chiffon',
        occasion: 'Festive',
        featured: true,
        bestSeller: true,
        rating: 4.8,
        reviewCount: 67,
        tags: ['anarkali', 'festive', 'emerald', 'mirror-work'],
      },
      {
        name: 'Gold Tissue Designer Saree',
        slug: 'gold-tissue-designer-saree',
        price: 28500,
        originalPrice: 35000,
        description: 'A luxurious gold tissue saree with hand-painted floral motifs and a contrast silk blouse, ideal for sangeet and reception evenings.',
        shortDescription: 'Hand-painted gold tissue saree with silk blouse',
        images: ['/images/products/designer-saree-1.jpg'],
        category: 'Festive Collection',
        sizes: ['Free Size', 'Blouse: XS-XL'],
        colors: ['Gold', 'Rose Gold'],
        fabric: 'Tissue Silk',
        occasion: 'Reception',
        featured: false,
        bestSeller: true,
        rating: 4.7,
        reviewCount: 89,
        tags: ['saree', 'gold', 'tissue', 'reception'],
      },
      {
        name: 'Midnight Blue Power Suit',
        slug: 'midnight-blue-power-suit',
        price: 22000,
        originalPrice: 28000,
        description: 'A tailored midnight blue pant suit with subtle gold buttons and a fitted silhouette, redefining modern luxury workwear for the contemporary woman.',
        shortDescription: 'Tailored midnight blue pant suit with gold accents',
        images: ['/images/products/power-suit-1.jpg'],
        category: 'Designer Suits',
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Midnight Blue', 'Charcoal'],
        fabric: 'Premium Crepe',
        occasion: 'Formal',
        featured: false,
        bestSeller: true,
        rating: 4.9,
        reviewCount: 34,
        tags: ['suit', 'formal', 'modern', 'power-dressing'],
      },
      {
        name: 'Champagne Sequin Party Gown',
        slug: 'champagne-sequin-party-gown',
        price: 31000,
        originalPrice: 39000,
        description: 'An enchanting champagne-hued gown covered in hand-stitched sequins, featuring an off-shoulder neckline and sweeping floor-length silhouette.',
        shortDescription: 'Hand-sequined champagne off-shoulder floor-length gown',
        images: ['/images/products/party-gown-1.jpg'],
        category: 'New Arrivals',
        sizes: ['XS', 'S', 'M', 'L'],
        colors: ['Champagne', 'Silver'],
        fabric: 'Net & Sequin',
        occasion: 'Party',
        featured: true,
        newArrival: true,
        rating: 5,
        reviewCount: 12,
        tags: ['gown', 'sequin', 'party', 'new'],
      },
      {
        name: 'Blush Pink Palazzo Co-ord Set',
        slug: 'blush-pink-palazzo-coord-set',
        price: 16500,
        originalPrice: 21000,
        description: 'A sophisticated blush pink palazzo co-ord set with delicate floral embroidery and ruffle detailing, perfect for brunches and casual festive events.',
        shortDescription: 'Blush pink floral-embroidered palazzo co-ord set',
        images: ['/images/products/coord-set-1.jpg'],
        category: 'New Arrivals',
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Blush Pink', 'Dusty Rose'],
        fabric: 'Georgette',
        occasion: 'Casual Festive',
        featured: false,
        newArrival: true,
        rating: 4.6,
        reviewCount: 19,
        tags: ['palazzo', 'coord', 'pink', 'new'],
      },
      {
        name: 'Royal Purple Banarasi Lehenga',
        slug: 'royal-purple-banarasi-lehenga',
        price: 74000,
        originalPrice: 92000,
        description: 'An opulent royal purple Banarasi silk lehenga with intricate kinari work, gold zari weaving, and a matching dupatta with floral motifs.',
        shortDescription: 'Opulent royal purple Banarasi silk lehenga with gold zari',
        images: ['/images/products/banarasi-lehenga-1.jpg'],
        category: 'Best Sellers',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom'],
        colors: ['Royal Purple', 'Wine'],
        fabric: 'Banarasi Silk',
        occasion: 'Wedding / Festive',
        featured: true,
        bestSeller: true,
        rating: 5,
        reviewCount: 103,
        tags: ['lehenga', 'banarasi', 'purple', 'bestseller'],
      },
    ];

    const products = await Product.insertMany(sampleProducts);
    res.status(201).json({ success: true, message: `${products.length} products seeded`, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
