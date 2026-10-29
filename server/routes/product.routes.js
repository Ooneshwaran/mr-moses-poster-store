const express = require('express');
const router = express.Router();
const repository = require('../config/repository');
const { requireAdminAuth } = require('../middleware/auth');
const designUpload = require('../middleware/designUpload');
const { saveDesignImage } = require('../config/storage');
const { INITIAL_PRODUCTS } = require('../config/initialProducts');

// GET /api/products - Public product catalog with real prices
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const products = await repository.getProducts(category);
    const featuredMap = await repository.getFeaturedDesignMap();
    const enriched = products.map(p => ({
      ...p,
      featuredImage: featuredMap[p.productId] || ''
    }));
    return res.json({
      success: true,
      count: enriched.length,
      products: enriched
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
    const featuredMap = await repository.getFeaturedDesignMap();
    return res.json({
      success: true,
      product: {
        ...product,
        featuredImage: featuredMap[product.productId] || ''
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/products/:productId - Admin update product price and stock availability
router.put('/:productId', requireAdminAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { price, inStock, badge, description, imageUrl } = req.body;

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

    // Allow admin to set or clear the product thumbnail image URL
    if (imageUrl !== undefined) {
      updateData.imageUrl = String(imageUrl).trim();
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

// POST /api/products/:productId/image - Admin upload product image
router.post('/:productId/image', requireAdminAuth, (req, res) => {
  designUpload.single('image')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({
        success: false,
        error: uploadErr.message || 'Image upload failed. Ensure file is a JPG, PNG, or WEBP under 15MB.'
      });
    }

    try {
      const { productId } = req.params;
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Please select an image file to upload.'
        });
      }

      const existing = await repository.getProductById(productId);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Product not found.'
        });
      }

      const storageResult = await saveDesignImage(req.file);
      const updated = await repository.updateProduct(productId, { imageUrl: storageResult.imageUrl });

      return res.json({
        success: true,
        message: `Image updated successfully for ${existing.name}.`,
        imageUrl: storageResult.imageUrl,
        product: updated
      });
    } catch (err) {
      console.error('Admin product image upload error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload product image.'
      });
    }
  });
});

module.exports = router;
