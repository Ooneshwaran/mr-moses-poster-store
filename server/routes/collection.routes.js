const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const repository = require('../config/repository');
const { requireAdminAuth } = require('../middleware/auth');
const designUpload = require('../middleware/designUpload');
const { saveDesignImage, deleteDesignImage } = require('../config/storage');

// Helper to generate unique design IDs
const generateDesignId = () => {
  return `des_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};

// ============================================================================
// PUBLIC CUSTOMER ROUTES
// ============================================================================

// GET /api/collections - List all 13 collections with live product prices and published design counts
router.get('/', async (req, res) => {
  try {
    const products = await repository.getProducts();
    const countMap = await repository.getDesignsCountMap();

    const collections = products.map(product => {
      const counts = countMap[product.productId] || { total: 0, published: 0 };
      return {
        collectionId: product.productId,
        category: product.category,
        name: product.name,
        size: product.size,
        dimensions: product.dimensions || product.size,
        description: product.description,
        price: product.price,
        inStock: product.inStock !== false,
        badge: product.badge,
        designCount: counts.published
      };
    });

    return res.json({
      success: true,
      collections
    });
  } catch (err) {
    console.error('Error fetching collections:', err);
    return res.status(500).json({ success: false, error: 'Failed to load collections.' });
  }
});

// GET /api/collections/:collectionId - Single collection info with published designs
router.get('/:collectionId', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const product = await repository.getProductById(collectionId);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Collection not found.' });
    }

    // Only published designs for customer view
    const designs = await repository.getDesigns(collectionId, true);

    return res.json({
      success: true,
      collection: {
        collectionId: product.productId,
        category: product.category,
        name: product.name,
        size: product.size,
        dimensions: product.dimensions || product.size,
        description: product.description,
        price: product.price,
        inStock: product.inStock !== false,
        badge: product.badge
      },
      designs
    });
  } catch (err) {
    console.error('Error fetching collection details:', err);
    return res.status(500).json({ success: false, error: 'Failed to load collection.' });
  }
});

// GET /api/collections/:collectionId/designs - Customer: get published designs for a collection
router.get('/:collectionId/designs', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const product = await repository.getProductById(collectionId);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Collection not found.' });
    }

    const designs = await repository.getDesigns(collectionId, true);

    return res.json({
      success: true,
      collectionId,
      productName: product.name,
      price: product.price,
      size: product.dimensions || product.size,
      count: designs.length,
      designs
    });
  } catch (err) {
    console.error('Error fetching collection designs:', err);
    return res.status(500).json({ success: false, error: 'Failed to load designs.' });
  }
});

// ============================================================================
// ADMIN ROUTES (Protected by requireAdminAuth)
// ============================================================================

// GET /api/collections/admin/all - Admin: view all collections with total and published counts
router.get('/admin/all', requireAdminAuth, async (req, res) => {
  try {
    const products = await repository.getProducts();
    const countMap = await repository.getDesignsCountMap();

    const collections = products.map(product => {
      const counts = countMap[product.productId] || { total: 0, published: 0 };
      return {
        collectionId: product.productId,
        category: product.category,
        name: product.name,
        size: product.size,
        dimensions: product.dimensions || product.size,
        description: product.description,
        price: product.price,
        inStock: product.inStock !== false,
        badge: product.badge,
        totalDesigns: counts.total,
        publishedDesigns: counts.published
      };
    });

    return res.json({
      success: true,
      collections
    });
  } catch (err) {
    console.error('Admin fetch collections error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load admin collections.' });
  }
});

// GET /api/collections/admin/:collectionId/designs - Admin: view all designs (published + hidden)
router.get('/admin/:collectionId/designs', requireAdminAuth, async (req, res) => {
  try {
    const { collectionId } = req.params;
    const product = await repository.getProductById(collectionId);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Collection not found.' });
    }

    // False = fetch all, including unpublished
    const designs = await repository.getDesigns(collectionId, false);

    return res.json({
      success: true,
      collection: {
        collectionId: product.productId,
        category: product.category,
        name: product.name,
        size: product.size,
        dimensions: product.dimensions || product.size,
        price: product.price
      },
      count: designs.length,
      designs
    });
  } catch (err) {
    console.error('Admin fetch collection designs error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load designs.' });
  }
});

// POST /api/collections/admin/:collectionId/designs - Admin: upload and publish new design
router.post('/admin/:collectionId/designs', requireAdminAuth, (req, res) => {
  designUpload.single('image')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({
        success: false,
        error: uploadErr.message || 'Image upload failed. Ensure file is a JPG, PNG, or WEBP under 15MB.'
      });
    }

    try {
      const { collectionId } = req.params;
      const { name, description = '', isPublished = 'true' } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Please select an image file to upload.'
        });
      }

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a design name.'
        });
      }

      const product = await repository.getProductById(collectionId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Collection "${collectionId}" does not exist.`
        });
      }

      // Save to persistent cloud or local storage
      const storageResult = await saveDesignImage(req.file);

      const designId = generateDesignId();
      const designData = {
        designId,
        collectionId,
        name: name.trim(),
        description: (description || '').trim(),
        imageUrl: storageResult.imageUrl,
        publicId: storageResult.publicId,
        storageType: storageResult.storageType,
        isPublished: String(isPublished) !== 'false'
      };

      const savedDesign = await repository.createDesign(designData);

      return res.status(201).json({
        success: true,
        message: `Design "${savedDesign.name}" added successfully to ${product.name}.`,
        design: savedDesign
      });
    } catch (err) {
      console.error('Admin add design error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to save design.'
      });
    }
  });
});

// PUT /api/collections/admin/designs/:designId - Admin: edit design details / replace image
router.put('/admin/designs/:designId', requireAdminAuth, (req, res) => {
  designUpload.single('image')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({
        success: false,
        error: uploadErr.message || 'Image upload failed.'
      });
    }

    try {
      const { designId } = req.params;
      const { name, description, isPublished } = req.body;

      const existing = await repository.getDesignById(designId);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Design not found.'
        });
      }

      const updateData = {};
      if (name !== undefined && name.trim().length > 0) {
        updateData.name = name.trim();
      }
      if (description !== undefined) {
        updateData.description = String(description).trim();
      }
      if (isPublished !== undefined) {
        updateData.isPublished = String(isPublished) === 'true' || isPublished === true;
      }

      // If a replacement image was uploaded
      if (req.file) {
        const storageResult = await saveDesignImage(req.file);
        // Delete old image if present
        if (existing.publicId) {
          await deleteDesignImage(existing.publicId, existing.storageType);
        }
        updateData.imageUrl = storageResult.imageUrl;
        updateData.publicId = storageResult.publicId;
        updateData.storageType = storageResult.storageType;
      }

      const updated = await repository.updateDesign(designId, updateData);

      return res.json({
        success: true,
        message: `Design "${updated.name}" updated successfully.`,
        design: updated
      });
    } catch (err) {
      console.error('Admin update design error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to update design.'
      });
    }
  });
});

// PATCH /api/collections/admin/designs/:designId/toggle - Admin: toggle publish/hide status
router.patch('/admin/designs/:designId/toggle', requireAdminAuth, async (req, res) => {
  try {
    const { designId } = req.params;
    const existing = await repository.getDesignById(designId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Design not found.'
      });
    }

    const newStatus = !existing.isPublished;
    const updated = await repository.updateDesign(designId, { isPublished: newStatus });

    return res.json({
      success: true,
      message: `Design is now ${newStatus ? 'Published' : 'Hidden'}.`,
      isPublished: newStatus,
      design: updated
    });
  } catch (err) {
    console.error('Admin toggle design status error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update design status.'
    });
  }
});

// DELETE /api/collections/admin/designs/:designId - Admin: delete design
router.delete('/admin/designs/:designId', requireAdminAuth, async (req, res) => {
  try {
    const { designId } = req.params;
    const existing = await repository.getDesignById(designId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Design not found.'
      });
    }

    // Delete image from storage
    if (existing.publicId) {
      await deleteDesignImage(existing.publicId, existing.storageType);
    }

    await repository.deleteDesign(designId);

    return res.json({
      success: true,
      message: `Design "${existing.name}" deleted successfully.`
    });
  } catch (err) {
    console.error('Admin delete design error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete design.'
    });
  }
});

module.exports = router;
