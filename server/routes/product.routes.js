const express = require('express');
const router = express.Router();
const repository = require('../config/repository');
const { requireAdminAuth } = require('../middleware/auth');
const { INITIAL_PRODUCTS } = require('../config/initialProducts');

// GET /api/products - Public product catalog with real prices
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const products = await repository.getProducts(category);
    return res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to load products.'
    });
  }
});

// GET /api/products/:productId - Single product details
router.get('/:productId', async (req, res) => {
  try {
    const product = await repository.getProductById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found.'
      });
    }
    return res.json({
      success: true,
      product
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/products/:productId - Admin update product price and stock availability
router.put('/:productId', requireAdminAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { price, inStock, badge, description } = req.body;

    const existing = await repository.getProductById(productId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Product not found.'
      });
    }

    const updateData = {};
    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({
          success: false,
          error: 'Price must be a valid positive number.'
        });
      }
      updateData.price = numPrice;
    }

    if (inStock !== undefined) {
      updateData.inStock = Boolean(inStock);
    }

    if (badge !== undefined) {
      updateData.badge = String(badge).trim();
    }

    if (description !== undefined) {
      updateData.description = String(description).trim();
    }

    const updated = await repository.updateProduct(productId, updateData);

    return res.json({
      success: true,
      message: `Product "${existing.name}" updated successfully.`,
      product: updated
    });
  } catch (err) {
    console.error('Error updating product:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update product.'
    });
  }
});

module.exports = router;
