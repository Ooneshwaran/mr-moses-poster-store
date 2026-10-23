const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { INITIAL_PRODUCTS } = require('./initialProducts');

let isMongoConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mrmoses';

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    isMongoConnected = true;
    console.log(`[Database] Successfully connected to MongoDB Atlas / Database (${mongoose.connection.host})`);

    // Ensure initial real products are seeded in MongoDB if collection is empty
    await seedInitialProductsIfEmpty();

    return true;
  } catch (err) {
    console.warn(`[Database] MongoDB connection attempt failed: ${err.message}`);
    console.warn('[Database] Falling back to local persistent storage engine. Update MONGODB_URI in .env to connect to MongoDB Atlas.');
    isMongoConnected = false;
    return false;
  }
};

const seedInitialProductsIfEmpty = async () => {
  if (!isMongoConnected) return;
  try {
    const Product = require('../models/Product');
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log('[Database] Seeding initial real products into MongoDB...');
      await Product.insertMany(INITIAL_PRODUCTS);
      console.log(`[Database] Successfully seeded ${INITIAL_PRODUCTS.length} real products.`);
    }
  } catch (err) {
    console.error('[Database] Error checking/seeding products in MongoDB:', err.message);
  }
};

const getMongoStatus = () => {
  return {
    connected: isMongoConnected,
    host: isMongoConnected && mongoose.connection ? mongoose.connection.host : 'Local Persistent Storage Engine'
  };
};

module.exports = {
  connectDB,
  getMongoStatus,
  isMongoConnected: () => isMongoConnected
};
