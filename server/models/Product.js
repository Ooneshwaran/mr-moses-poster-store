const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    required: true,
    enum: ['posters', 'stickers', 'frames', 'combos', 'custom']
  },
  name: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  dimensions: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  inStock: {
    type: Boolean,
    default: true
  },
  isCustomizable: {
    type: Boolean,
    default: false
  },
  badge: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
