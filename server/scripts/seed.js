const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { connectDB, isMongoConnected } = require('../config/db');
const Product = require('../models/Product');
const { INITIAL_PRODUCTS } = require('../config/initialProducts');

const seedCatalog = async () => {
  await connectDB();

  if (isMongoConnected()) {
    console.log('[Seed] Syncing real products to MongoDB Atlas...');
    for (const prod of INITIAL_PRODUCTS) {
      await Product.findOneAndUpdate(
        { productId: prod.productId },
        { $set: prod },
        { upsert: true, new: true }
      );
    }
    console.log(`[Seed] Successfully seeded ${INITIAL_PRODUCTS.length} products to MongoDB.`);
  } else {
    console.log('[Seed] Database is operating on local persistent storage engine. Initial products are already in place.');
  }

  process.exit(0);
};

seedCatalog().catch(err => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
