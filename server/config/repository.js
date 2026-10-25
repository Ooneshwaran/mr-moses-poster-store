const fs = require('fs');
const path = require('path');
const { isMongoConnected } = require('./db');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Admin = require('../models/Admin');
const Design = require('../models/Design');
const { INITIAL_PRODUCTS } = require('./initialProducts');

// Data directory for local fallback persistence
const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const ensureLocalDB = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      products: INITIAL_PRODUCTS.map(p => ({
        ...p,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),
      orders: [], // STRICT REQUIREMENT: Absolutely NO sample orders!
      admins: [],
      designs: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
};

const readLocalDB = () => {
  ensureLocalDB();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.designs) parsed.designs = [];
    return parsed;
  } catch (err) {
    console.error('Error reading local fallback db:', err);
    return { products: INITIAL_PRODUCTS, orders: [], admins: [], designs: [] };
  }
};

const writeLocalDB = (data) => {
  ensureLocalDB();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

const repository = {
  // ===================== PRODUCTS =====================
  async getProducts(category) {
    if (isMongoConnected()) {
      const query = category ? { category } : {};
      return await Product.find(query).sort({ category: 1, price: 1 }).lean();
    } else {
      const db = readLocalDB();
      let list = db.products;
      if (category) {
        list = list.filter(p => p.category === category);
      }
      return list;
    }
  },

  async getProductById(productId) {
    if (isMongoConnected()) {
      return await Product.findOne({ productId }).lean();
    } else {
      const db = readLocalDB();
      return db.products.find(p => p.productId === productId) || null;
    }
  },

  async updateProduct(productId, updateData) {
    if (isMongoConnected()) {
      return await Product.findOneAndUpdate(
        { productId },
        { $set: updateData },
        { new: true }
      ).lean();
    } else {
      const db = readLocalDB();
      const idx = db.products.findIndex(p => p.productId === productId);
      if (idx === -1) return null;
      db.products[idx] = {
        ...db.products[idx],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      writeLocalDB(db);
      return db.products[idx];
    }
  },

  // ===================== ORDERS =====================
  async createOrder(orderData) {
    if (isMongoConnected()) {
      const newOrder = new Order(orderData);
      return await newOrder.save();
    } else {
      const db = readLocalDB();
      const record = {
        ...orderData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.orders.push(record);
      writeLocalDB(db);
      return record;
    }
  },

  async getOrders(filter = {}) {
    if (isMongoConnected()) {
      const query = {};
      if (filter.status && filter.status !== 'All') {
        query.status = filter.status;
      }
      if (filter.search) {
        const regex = new RegExp(filter.search, 'i');
        query.$or = [
          { orderId: regex },
          { 'customer.name': regex },
          { 'customer.whatsapp': regex }
        ];
      }
      return await Order.find(query).sort({ createdAt: -1 }).lean();
    } else {
      const db = readLocalDB();
      let list = db.orders;
      if (filter.status && filter.status !== 'All') {
        list = list.filter(o => o.status === filter.status);
      }
      if (filter.search) {
        const term = filter.search.toLowerCase();
        list = list.filter(o =>
          (o.orderId && o.orderId.toLowerCase().includes(term)) ||
          (o.customer?.name && o.customer.name.toLowerCase().includes(term)) ||
          (o.customer?.whatsapp && o.customer.whatsapp.includes(term))
        );
      }
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },

  async getOrderById(orderId) {
    if (isMongoConnected()) {
      return await Order.findOne({ orderId }).lean();
    } else {
      const db = readLocalDB();
      return db.orders.find(o => o.orderId === orderId) || null;
    }
  },

  async findOrderForCustomer(orderId, whatsapp) {
    // Clean and normalize WhatsApp number (digits only, e.g. last 10 digits)
    const cleanPhone = (phone) => (phone || '').replace(/\D/g, '').slice(-10);
    const targetPhone = cleanPhone(whatsapp);

    if (isMongoConnected()) {
      const orders = await Order.find({ orderId: { $regex: new RegExp(`^${orderId.trim()}$`, 'i') } }).lean();
      for (const order of orders) {
        if (cleanPhone(order.customer.whatsapp) === targetPhone) {
          // Return customer-safe view (strip private internal fields)
          return {
            orderId: order.orderId,
            status: order.status,
            customerName: order.customer.name,
            whatsappMasked: order.customer.whatsapp.slice(0, 2) + '******' + order.customer.whatsapp.slice(-2),
            deliveryCity: order.customer.address.city,
            items: order.items,
            orderType: order.orderType,
            totalPrice: order.totalPrice,
            isCustomPricePending: order.isCustomPricePending,
            finalPriceNote: order.finalPriceNote,
            paymentStatus: order.paymentStatus,
            statusHistory: order.statusHistory,
            createdAt: order.createdAt
          };
        }
      }
      return null;
    } else {
      const db = readLocalDB();
      const order = db.orders.find(
        o => o.orderId.toLowerCase() === orderId.trim().toLowerCase() &&
             cleanPhone(o.customer.whatsapp) === targetPhone
      );
      if (!order) return null;
      return {
        orderId: order.orderId,
        status: order.status,
        customerName: order.customer.name,
        whatsappMasked: order.customer.whatsapp.slice(0, 2) + '******' + order.customer.whatsapp.slice(-2),
        deliveryCity: order.customer.address.city,
        items: order.items,
        orderType: order.orderType,
        totalPrice: order.totalPrice,
        isCustomPricePending: order.isCustomPricePending,
        finalPriceNote: order.finalPriceNote,
        paymentStatus: order.paymentStatus,
        statusHistory: order.statusHistory,
        createdAt: order.createdAt
      };
    }
  },

  async updateOrderStatus(orderId, { status, paymentStatus, note, finalPriceNote, adjustedPrice }) {
    const validStatuses = [
      'New', 'Confirmed', 'Designing', 'Printing',
      'Ready to Ship', 'Shipped', 'Delivered', 'Cancelled'
    ];
    if (status && !validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const historyEntry = {
      status: status || 'Updated',
      timestamp: new Date(),
      note: note || `Order updated to ${status}`
    };

    if (isMongoConnected()) {
      const updateFields = {
        updatedAt: new Date()
      };
      if (status) updateFields.status = status;
      if (paymentStatus) updateFields.paymentStatus = paymentStatus;
      if (finalPriceNote !== undefined) updateFields.finalPriceNote = finalPriceNote;
      if (adjustedPrice !== undefined && Number(adjustedPrice) >= 0) {
        updateFields.totalPrice = Number(adjustedPrice);
        updateFields.isCustomPricePending = false;
      }

      return await Order.findOneAndUpdate(
        { orderId },
        {
          $set: updateFields,
          $push: { statusHistory: historyEntry }
        },
        { new: true }
      ).lean();
    } else {
      const db = readLocalDB();
      const idx = db.orders.findIndex(o => o.orderId === orderId);
      if (idx === -1) return null;

      const order = db.orders[idx];
      if (status) order.status = status;
      if (paymentStatus) order.paymentStatus = paymentStatus;
      if (finalPriceNote !== undefined) order.finalPriceNote = finalPriceNote;
      if (adjustedPrice !== undefined && Number(adjustedPrice) >= 0) {
        order.totalPrice = Number(adjustedPrice);
        order.isCustomPricePending = false;
      }
      order.updatedAt = new Date().toISOString();
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push(historyEntry);

      writeLocalDB(db);
      return order;
    }
  },

  async getOrderStats() {
    const orders = await this.getOrders();
    const stats = {
      totalOrders: orders.length,
      newOrders: orders.filter(o => o.status === 'New').length,
      inProgress: orders.filter(o => ['Confirmed', 'Designing', 'Printing', 'Ready to Ship', 'Shipped'].includes(o.status)).length,
      deliveredOrders: orders.filter(o => o.status === 'Delivered').length,
      cancelledOrders: orders.filter(o => o.status === 'Cancelled').length,
      totalRevenue: orders
        .filter(o => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0)
    };
    return stats;
  },

  // ===================== ADMINS =====================
  async getAdminByUsername(username) {
    const normalized = (username || '').toLowerCase().trim();
    if (isMongoConnected()) {
      return await Admin.findOne({ username: normalized }).lean();
    } else {
      const db = readLocalDB();
      return db.admins.find(a => a.username.toLowerCase() === normalized) || null;
    }
  },

  async hasAnyAdmin() {
    if (isMongoConnected()) {
      const count = await Admin.countDocuments();
      return count > 0;
    } else {
      const db = readLocalDB();
      return db.admins && db.admins.length > 0;
    }
  },

  async createAdmin({ username, passwordHash }) {
    const normalized = username.toLowerCase().trim();
    if (isMongoConnected()) {
      const admin = new Admin({ username: normalized, passwordHash });
      return await admin.save();
    } else {
      const db = readLocalDB();
      const existing = db.admins.find(a => a.username.toLowerCase() === normalized);
      if (existing) {
        throw new Error('Admin username already exists');
      }
      const admin = {
        username: normalized,
        passwordHash,
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      db.admins.push(admin);
      writeLocalDB(db);
      return admin;
    }
  },

  async updateAdminLastLogin(username) {
    const normalized = username.toLowerCase().trim();
    if (isMongoConnected()) {
      await Admin.updateOne({ username: normalized }, { $set: { lastLogin: new Date() } });
    } else {
      const db = readLocalDB();
      const admin = db.admins.find(a => a.username.toLowerCase() === normalized);
      if (admin) {
        admin.lastLogin = new Date().toISOString();
        writeLocalDB(db);
      }
    }
  },

  // ===================== DESIGNS / COLLECTIONS =====================
  async getDesigns(collectionId, publishedOnly = false) {
    if (isMongoConnected()) {
      const query = {};
      if (collectionId) query.collectionId = collectionId;
      if (publishedOnly) query.isPublished = true;
      return await Design.find(query).sort({ createdAt: -1 }).lean();
    } else {
      const db = readLocalDB();
      let list = db.designs || [];
      if (collectionId) {
        list = list.filter(d => d.collectionId === collectionId);
      }
      if (publishedOnly) {
        list = list.filter(d => d.isPublished !== false);
      }
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },

  async getDesignById(designId) {
    if (isMongoConnected()) {
      return await Design.findOne({ designId }).lean();
    } else {
      const db = readLocalDB();
      return (db.designs || []).find(d => d.designId === designId) || null;
    }
  },

  async createDesign(designData) {
    if (isMongoConnected()) {
      const newDesign = new Design(designData);
      return await newDesign.save();
    } else {
      const db = readLocalDB();
      if (!db.designs) db.designs = [];
      const record = {
        ...designData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.designs.push(record);
      writeLocalDB(db);
      return record;
    }
  },

  async updateDesign(designId, updateData) {
    if (isMongoConnected()) {
      return await Design.findOneAndUpdate(
        { designId },
        { $set: updateData },
        { new: true }
      ).lean();
    } else {
      const db = readLocalDB();
      if (!db.designs) db.designs = [];
      const idx = db.designs.findIndex(d => d.designId === designId);
      if (idx === -1) return null;
      db.designs[idx] = {
        ...db.designs[idx],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      writeLocalDB(db);
      return db.designs[idx];
    }
  },

  async deleteDesign(designId) {
    if (isMongoConnected()) {
      return await Design.findOneAndDelete({ designId }).lean();
    } else {
      const db = readLocalDB();
      if (!db.designs) return null;
      const idx = db.designs.findIndex(d => d.designId === designId);
      if (idx === -1) return null;
      const removed = db.designs.splice(idx, 1)[0];
      writeLocalDB(db);
      return removed;
    }
  },

  async getDesignsCountMap() {
    const counts = {};
    if (isMongoConnected()) {
      const allDesigns = await Design.find({}, { collectionId: 1, isPublished: 1 }).lean();
      allDesigns.forEach(d => {
        if (!counts[d.collectionId]) {
          counts[d.collectionId] = { total: 0, published: 0 };
        }
        counts[d.collectionId].total += 1;
        if (d.isPublished) counts[d.collectionId].published += 1;
      });
    } else {
      const db = readLocalDB();
      (db.designs || []).forEach(d => {
        if (!counts[d.collectionId]) {
          counts[d.collectionId] = { total: 0, published: 0 };
        }
        counts[d.collectionId].total += 1;
        if (d.isPublished !== false) counts[d.collectionId].published += 1;
      });
    }
    return counts;
  }
};

module.exports = repository;
