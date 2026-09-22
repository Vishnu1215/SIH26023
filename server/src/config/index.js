import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root directory
const projectRoot = path.resolve(__dirname, '../../../');

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'sih26023-cmpdi-super-secret-jwt-key-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  upload: {
    directory: process.env.UPLOAD_DIR
      ? path.resolve(projectRoot, process.env.UPLOAD_DIR)
      : path.resolve(projectRoot, 'uploads/documents'),
    maxFileSize: 20 * 1024 * 1024, // 20 MB
    allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx', 'csv']
  },
  sampleData: {
    directory: path.resolve(projectRoot, 'sample-data')
  }
};
