const mongoose = require('mongoose');

const designSchema = new mongoose.Schema({
  designId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  collectionId: {
    type: String,
    required: true,
    index: true // Matches product.productId, e.g. 'poster-a3', 'frame-12x15'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    default: ''
  },
  storageType: {
    type: String,
    enum: ['cloudinary', 'local'],
    default: 'local'
  },
  isPublished: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Design', designSchema);
