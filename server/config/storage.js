const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

const DESIGNS_DIR = path.join(__dirname, '../../uploads/designs');
if (!fs.existsSync(DESIGNS_DIR)) {
  fs.mkdirSync(DESIGNS_DIR, { recursive: true });
}

// Check if Cloudinary is configured via environment variables
const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('[Storage] Cloudinary cloud storage configured and ready.');
} else {
  console.log('[Storage] Using persistent local disk storage (/uploads/designs). Configure CLOUDINARY_* environment variables for cloud deployment.');
}

/**
 * Upload an image to persistent storage (Cloudinary if available, otherwise local persistent directory)
 * @param {Object} file - Multer file object
 * @returns {Promise<{ imageUrl: string, publicId: string, storageType: 'cloudinary' | 'local' }>}
 */
const saveDesignImage = async (file) => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  if (isCloudinaryConfigured()) {
    try {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: 'mr_moses_designs',
        resource_type: 'image',
        use_filename: false,
        unique_filename: true
      });

      // Remove temporary file from local disk after successful cloud upload
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (e) {
        // Non-blocking cleanup warning
      }

      return {
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        storageType: 'cloudinary'
      };
    } catch (err) {
      console.error('[Storage] Cloudinary upload failed, falling back to local persistent storage:', err.message);
      // Fall through to local fallback
    }
  }

  // Local persistent storage fallback
  const filename = path.basename(file.path);
  const targetPath = path.join(DESIGNS_DIR, filename);

  // If multer uploaded directly to another directory, move it to DESIGNS_DIR
  if (file.path !== targetPath && fs.existsSync(file.path)) {
    fs.renameSync(file.path, targetPath);
  }

  const permanentUrl = `/uploads/designs/${filename}`;

  return {
    imageUrl: permanentUrl,
    publicId: filename,
    storageType: 'local'
  };
};

/**
 * Delete an image from storage
 * @param {string} publicId
 * @param {'cloudinary' | 'local'} storageType
 */
const deleteDesignImage = async (publicId, storageType) => {
  if (!publicId) return;

  try {
    if (storageType === 'cloudinary' && isCloudinaryConfigured()) {
      await cloudinary.uploader.destroy(publicId);
    } else {
      const localPath = path.join(DESIGNS_DIR, path.basename(publicId));
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }
  } catch (err) {
    console.warn(`[Storage] Failed to delete image (${publicId}):`, err.message);
  }
};

module.exports = {
  saveDesignImage,
  deleteDesignImage,
  isCloudinaryConfigured
};
