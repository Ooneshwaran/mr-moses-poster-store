const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const repository = require('../config/repository');
const upload = require('../middleware/upload');
const { requireAdminAuth } = require('../middleware/auth');
const { orderLimiter } = require('../middleware/rateLimiter');

// Helper to generate a unique human-friendly Order ID
const generateOrderId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `MMP-${year}${month}${day}-${randomCode}`;
};

// POST /api/orders - Submit real customer order
router.post('/', orderLimiter, (req, res) => {
  upload.single('designFile')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({
        success: false,
        error: uploadErr.message || 'File upload failed. Ensure file is an image or PDF under 15MB.'
      });
    }

    try {
      const {
        customerName,
        customerWhatsapp,
        street,
        city,
        pincode,
        customNotes,
        orderType = 'standard'
      } = req.body;

      // 1. Validate customer information
      if (!customerName || customerName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Please provide your full name.'
        });
      }

      const digitsOnlyPhone = (customerWhatsapp || '').replace(/\D/g, '');
      if (digitsOnlyPhone.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid 10-digit WhatsApp number so we can contact you.'
        });
      }

      if (!street || !city || !pincode) {
        return res.status(400).json({
          success: false,
          error: 'Please provide complete delivery address details (Street, City, Pincode).'
        });
      }

      // 2. Parse ordered items
      let rawItems = [];
      if (req.body.items) {
        try {
          rawItems = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
        } catch (e) {
          return res.status(400).json({
            success: false,
            error: 'Invalid order items format.'
          });
        }
      }

      // If single item submitted directly via fields
      if (rawItems.length === 0 && req.body.productId) {
        rawItems.push({
          productId: req.body.productId,
          quantity: parseInt(req.body.quantity, 10) || 1,
          customNotes: req.body.customNotes || ''
        });
      }

      if (rawItems.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Your order must contain at least one product.'
        });
      }

      // 3. Server-side price calculation using active database prices
      let totalPrice = 0;
      const verifiedItems = [];
      let isCustomPricePending = orderType === 'custom';

      for (const item of rawItems) {
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const product = await repository.getProductById(item.productId);

        if (!product) {
          return res.status(400).json({
            success: false,
            error: `Selected product "${item.productId}" is not available.`
          });
        }

        if (product.inStock === false) {
          return res.status(400).json({
            success: false,
            error: `Product "${product.name}" is currently out of stock.`
          });
        }

        const unitPrice = product.price;
        const subtotal = unitPrice * qty;
        totalPrice += subtotal;

        // If designId is provided, verify and attach design details
        let designId = item.designId || (req.body.designId && rawItems.length === 1 ? req.body.designId : '');
        let designName = item.designName || (req.body.designName && rawItems.length === 1 ? req.body.designName : '');
        let designImage = item.designImage || (req.body.designImage && rawItems.length === 1 ? req.body.designImage : '');

        if (designId) {
          const design = await repository.getDesignById(designId);
          if (design) {
            designName = design.name;
            designImage = design.imageUrl;
          }
        }

        verifiedItems.push({
          productId: product.productId,
          name: product.name,
          category: product.category,
          size: product.size,
          quantity: qty,
          unitPrice,
          subtotal,
          customNotes: item.customNotes || '',
          designId,
          designName,
          designImage
        });
      }

      // 4. Handle custom design file upload metadata
      let customDesignFile = undefined;
      if (req.file) {
        customDesignFile = {
          originalName: req.file.originalname,
          filename: req.file.filename,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        };
      }

      // 5. Generate unique Order ID
      const orderId = generateOrderId();

      // 6. Assemble complete order record
      const orderData = {
        orderId,
        customer: {
          name: customerName.trim(),
          whatsapp: digitsOnlyPhone.slice(-10),
          address: {
            street: street.trim(),
            city: city.trim(),
            pincode: pincode.trim()
          }
        },
        items: verifiedItems,
        orderType,
        customNotes: (customNotes || '').trim(),
        customDesignFile,
        totalPrice,
        isCustomPricePending,
        finalPriceNote: isCustomPricePending
          ? 'Final price with custom printing charges will be verified & communicated on WhatsApp.'
          : '',
        status: 'New',
        paymentStatus: 'Pending',
        statusHistory: [
          {
            status: 'New',
            timestamp: new Date(),
            note: 'Order submitted successfully by customer.'
          }
        ]
      };

      // 7. Save real order to database
      const savedOrder = await repository.createOrder(orderData);

      // 8. Generate WhatsApp pre-filled chat link for the customer
      const storeWhatsApp = process.env.WHATSAPP_NUMBER || '8754126367';
      const itemsListText = verifiedItems.map(i => `${i.name} (${i.size}) x${i.quantity}`).join(', ');
      const customerMsg = encodeURIComponent(
        `Hi Mr Moses Poster Store! I just placed order #${orderId}.\n` +
        `Name: ${customerName}\n` +
        `Items: ${itemsListText}\n` +
        `Total: ₹${totalPrice}${isCustomPricePending ? ' (Custom charges to be confirmed)' : ''}\n` +
        `Please confirm my order details.`
      );
      const customerWhatsAppLink = `https://wa.me/91${storeWhatsApp}?text=${customerMsg}`;

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully! Your order has been saved.',
        orderId,
        totalPrice,
        isCustomPricePending,
        customerWhatsAppLink,
        order: {
          orderId,
          totalPrice,
          itemsCount: verifiedItems.length,
          status: 'New',
          createdAt: savedOrder.createdAt
        }
      });
    } catch (err) {
      console.error('Error creating order:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to save your order. Please try again or contact us directly on WhatsApp.'
      });
    }
  });
});

// GET /api/orders/track - Secure order tracking (Order ID + WhatsApp verification)
router.get('/track', async (req, res) => {
  try {
    const { orderId, whatsapp } = req.query;

    if (!orderId || !whatsapp) {
      return res.status(400).json({
        success: false,
        error: 'Both Order ID and WhatsApp number are required to track your order.'
      });
    }

    const order = await repository.findOrderForCustomer(orderId, whatsapp);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'No matching order found for this Order ID and WhatsApp number. Please check your credentials.'
      });
    }

    return res.json({
      success: true,
      order
    });
  } catch (err) {
    console.error('Track order error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve order tracking information.'
    });
  }
});

// ===================== ADMIN ROUTES =====================

// GET /api/orders - Admin fetch all real orders (with filter and search)
router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const orders = await repository.getOrders({ status, search });
    return res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error('Admin get orders error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve orders.'
    });
  }
});

// GET /api/orders/stats - Admin overview statistics
router.get('/stats', requireAdminAuth, async (req, res) => {
  try {
    const stats = await repository.getOrderStats();
    return res.json({
      success: true,
      stats
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders/:orderId - Admin single order full details
router.get('/:orderId', requireAdminAuth, async (req, res) => {
  try {
    const order = await repository.getOrderById(req.params.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found.'
      });
    }
    return res.json({
      success: true,
      order
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/orders/:orderId/status - Admin update order status and notes
router.put('/:orderId/status', requireAdminAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, paymentStatus, note, finalPriceNote, adjustedPrice } = req.body;

    const updated = await repository.updateOrderStatus(orderId, {
      status,
      paymentStatus,
      note,
      finalPriceNote,
      adjustedPrice
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Order not found.'
      });
    }

    return res.json({
      success: true,
      message: `Order #${orderId} status updated to "${status || updated.status}".`,
      order: updated
    });
  } catch (err) {
    console.error('Update order status error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to update order status.'
    });
  }
});

// GET /api/orders/:orderId/file - Secure download of customer design file
router.get('/:orderId/file', requireAdminAuth, async (req, res) => {
  try {
    const order = await repository.getOrderById(req.params.orderId);
    if (!order || !order.customDesignFile) {
      return res.status(404).json({
        success: false,
        error: 'No design file associated with this order.'
      });
    }

    const filename = path.basename(order.customDesignFile.filename);
    const filePath = path.join(__dirname, '../../uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Design file not found on disk.'
      });
    }

    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(order.customDesignFile.originalName)}"`);
    res.setHeader('Content-Type', order.customDesignFile.mimetype || 'application/octet-stream');
    return res.sendFile(filePath);
  } catch (err) {
    console.error('Download file error:', err);
    return res.status(500).json({ success: false, error: 'Failed to access file.' });
  }
});

module.exports = router;
