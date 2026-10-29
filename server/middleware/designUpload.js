const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const TEMP_DIR = isServerless ? os.tmpdir() : path.join(__dirname, '../../uploads/temp');
try {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
} catch (err) {
  // Gracefully handle read-only environments
}

const MIME_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const ext = MIME_MAP[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.jpg';
    const rand = crypto.randomBytes(8).toString('hex');
    const safeName = `design_${Date.now()}_${rand}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  if (MIME_MAP[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format. Only JPG, PNG, and WEBP image formats are accepted for collection designs.'), false);
  }
};

const designUpload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 Megabytes
  },
  fileFilter
});

module.exports = designUpload;
