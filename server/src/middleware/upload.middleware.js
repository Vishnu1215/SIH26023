import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';

// Target upload directory: uploads/documents/
const uploadDir = config.upload.directory;

// Automatically create directory if it does not exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists at runtime as well
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${uuidv4().slice(0, 8)}`;
    cb(null, `${safeBaseName}-${uniqueSuffix}${ext}`);
  }
});

// File filter for accepted document extensions
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  if (config.upload.allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    const error = new Error(
      `Unsupported file format '.${ext}'. Accepted formats: ${config.upload.allowedExtensions.join(', ').toUpperCase()}`
    );
    error.code = 'UNSUPPORTED_FILE_TYPE';
    cb(error, false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter
});

// Wrapper middleware for user-friendly error formatting
export const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (err) => {
    if (!err) {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please select and attach a document.'
        });
      }
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the 20 MB limit.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    }

    if (err.code === 'UNSUPPORTED_FILE_TYPE') {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed.'
    });
  });
};
