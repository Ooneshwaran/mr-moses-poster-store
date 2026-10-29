const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOADS_DIR = isServerless ? os.tmpdir() : path.join(__dirname, '../../uploads');

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  // Gracefully handle read-only environments
}

// Whitelist of allowed extensions and mimetypes
const MIME_EXTENSION_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = MIME_EXTENSION_MAP[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const safeName = `design_${Date.now()}_${randomSuffix}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  if (MIME_EXTENSION_MAP[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPG, PNG, WEBP, and PDF files are accepted for custom designs.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 Megabytes maximum
  },
  fileFilter
});

module.exports = upload;
