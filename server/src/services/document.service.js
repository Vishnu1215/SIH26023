import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { config } from '../config/index.js';
import documentModel from '../models/document.model.js';
import {
  createDocumentMetadata,
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES
} from '../utils/documentMetadata.js';

// MIME type map for standard extensions
const MIME_TYPE_MAP = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png'
};

// Folder name to category mapping matching the 10 exact sample-data folders
const FOLDER_CATEGORY_MAP = {
  '01_production': DOCUMENT_CATEGORIES.PRODUCTION,
  '02_subsidiary_production': DOCUMENT_CATEGORIES.SUBSIDIARY_PRODUCTION,
  '03_geological_resources': DOCUMENT_CATEGORIES.GEOLOGICAL_RESOURCES,
  '04_cmpdi_documents': DOCUMENT_CATEGORIES.CMPDI_DOCUMENTS,
  '05_parliamentary_qa': DOCUMENT_CATEGORIES.PARLIAMENTARY_QA,
  '06_ministry_of_coal_reports': DOCUMENT_CATEGORIES.MINISTRY_REPORTS,
  '07_coal_quality_validation': DOCUMENT_CATEGORIES.COAL_QUALITY,
  '08_official_cco_excel': DOCUMENT_CATEGORIES.OFFICIAL_CCO_EXCEL,
  '09_mine_master': DOCUMENT_CATEGORIES.MINE_MASTER,
  '10_historical_data': DOCUMENT_CATEGORIES.HISTORICAL_DATA
};

/**
 * Retrieve all documents sorted newest first
 * @returns {Array<Object>} List of document records
 */
export const getAllDocuments = () => {
  return documentModel.getAllDocuments();
};

/**
 * Notify the FastAPI AI service of uploaded document
 * @param {Object} metadata
 * @returns {Promise<string>} 'Uploaded' | 'Uploaded (Pending AI)'
 */
export const notifyAiService = async (metadata) => {
  const payload = {
    documentId: metadata.documentId,
    originalName: metadata.originalName,
    storedName: metadata.storedName,
    mimeType: metadata.mimeType,
    size: metadata.size,
    uploadedAt: metadata.uploadedAt
  };

  try {
    const response = await axios.post(`${config.aiServiceUrl}/ingest`, payload, {
      timeout: 3500
    });

    if (response.status === 200 && response.data?.status === 'received') {
      return DOCUMENT_STATUSES.UPLOADED;
    }
    return DOCUMENT_STATUSES.UPLOADED_PENDING_AI;
  } catch (error) {
    console.warn(
      `[DocumentService] FastAPI ingest notification unreachable (${error.message}). Status set to '${DOCUMENT_STATUSES.UPLOADED_PENDING_AI}'.`
    );
    return DOCUMENT_STATUSES.UPLOADED_PENDING_AI;
  }
};

/**
 * Save new document metadata to model
 * @param {Object} metadata
 * @returns {Object} Stored record
 */
export const saveDocument = (metadata) => {
  return documentModel.addDocument(metadata);
};

/**
 * Recursively collect files from directory
 */
const walkDirectory = (dir) => {
  let files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walkDirectory(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
};

/**
 * Load and register representative files from sample-data/ into in-memory store
 * (No OCR, No AI, No copying - register metadata only)
 * @returns {Array<Object>} Newly registered sample documents
 */
export const loadSampleDataset = () => {
  const sampleDir = config.sampleData.directory;
  if (!fs.existsSync(sampleDir)) {
    throw new Error(`Sample data directory not found at: ${sampleDir}`);
  }

  const allFilePaths = walkDirectory(sampleDir);
  const registered = [];

  for (const filePath of allFilePaths) {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    if (!config.upload.allowedExtensions.includes(ext)) {
      continue; // Skip non-supported files (.gitkeep, .md, etc.)
    }

    const fileName = path.basename(filePath);
    const parentFolder = path.basename(path.dirname(filePath)).toLowerCase();
    const category = FOLDER_CATEGORY_MAP[parentFolder] || DOCUMENT_CATEGORIES.UNKNOWN;
    const stats = fs.statSync(filePath);

    // Prevent duplicate registration if already registered
    const alreadyExists = documentModel.getAllDocuments().some(
      (doc) => doc.originalName === fileName && doc.size === stats.size
    );

    if (alreadyExists) {
      continue;
    }

    const metadata = createDocumentMetadata(
      {
        originalname: fileName,
        filename: fileName,
        path: filePath,
        mimetype: MIME_TYPE_MAP[ext] || 'application/octet-stream',
        size: stats.size
      },
      category,
      DOCUMENT_STATUSES.UPLOADED,
      { filePath }
    );

    documentModel.addDocument(metadata);
    registered.push(metadata);
  }

  return registered;
};
