const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  size: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
  customNotes: { type: String, default: '' },
  designId: { type: String, default: '' },
  designName: { type: String, default: '' },
  designImage: { type: String, default: '' }
}, { _id: false });

const orderStatusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customer: {
    name: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true, trim: true, index: true },
    address: {
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true }
    }
  },
  items: [orderItemSchema],
  orderType: {
    type: String,
    enum: ['standard', 'custom', 'combo'],
    default: 'standard'
  },
  customNotes: {
    type: String,
    default: ''
  },
  customDesignFile: {
    originalName: { type: String },
    filename: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    path: { type: String }
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  isCustomPricePending: {
    type: Boolean,
    default: false
  },
  finalPriceNote: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    required: true,
    enum: [
      'New',
      'Confirmed',
      'Designing',
      'Printing',
      'Ready to Ship',
      'Shipped',
      'Delivered',
      'Cancelled'
    ],
    default: 'New',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Advance Paid', 'Paid', 'Cancelled'],
    default: 'Pending'
  },
  statusHistory: [orderStatusHistorySchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
