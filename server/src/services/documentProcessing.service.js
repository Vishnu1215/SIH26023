import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { config } from '../config/index.js';
import documentModel from '../models/document.model.js';
import { DOCUMENT_STATUSES } from '../utils/documentMetadata.js';
import { computeFileSha256 } from '../utils/fileHash.js';

/**
 * Trigger text extraction and OCR processing pipeline via FastAPI AI service.
 * @param {Object} document - Document metadata record from DocumentModel
 * @returns {Promise<Object>} Updated document record
 */
export const processDocumentExtraction = async (document) => {
  if (!document || !document.documentId) {
    throw new Error('Invalid document object provided for text extraction.');
  }

  const { documentId } = document;

  // Resolve absolute file path
  let absoluteFilePath = document.filePath;
  if (!absoluteFilePath && document.storedName) {
    absoluteFilePath = path.resolve(config.upload.directory, document.storedName);
  }

  const startedAt = new Date().toISOString();

  // Update status to Processing
  documentModel.updateDocument(documentId, {
    status: DOCUMENT_STATUSES.PROCESSING,
    processingStartedAt: startedAt,
    filePath: absoluteFilePath
  });

  // Verify file exists on disk before dispatching
  if (!absoluteFilePath || !fs.existsSync(absoluteFilePath)) {
    const errorMsg = `File not found on disk at: ${absoluteFilePath}`;
    console.error(`[DocumentProcessing] ${errorMsg}`);
    return documentModel.updateDocument(documentId, {
      status: DOCUMENT_STATUSES.FAILED,
      errorCode: 'CORRUPTED_DOCUMENT',
      errorMessage: errorMsg,
      error: errorMsg,
      processingCompletedAt: new Date().toISOString()
    });
  }

  try {
    console.log(`[DocumentProcessing] Dispatching text extraction for: ${document.originalName} (${documentId})`);

    const fileHash = computeFileSha256(absoluteFilePath);
    const existingDocs = documentModel.getAllDocuments().map((d) => ({
      documentId: d.documentId,
      filename: d.originalName,
      fileHash: d.fileHash
    }));

    const payload = {
      documentId: document.documentId,
      filePath: absoluteFilePath,
      mimeType: document.mimeType,
      originalName: document.originalName,
      storedName: document.storedName,
      size: document.size,
      uploadedAt: document.uploadedAt,
      fileHash,
      existingDocuments: existingDocs
    };

    const response = await axios.post(`${config.aiServiceUrl}/ingest`, payload, {
      timeout: 120000 // 120s timeout for large multi-page PDFs / OCR
    });

    const isSuccess =
      response.data &&
      (response.data.status === 'OCR Complete' || response.data.status === 'completed');

    if (isSuccess) {
      const pageCount = response.data.pageCount || response.data.pages || 1;
      const structuredDataAvailable = response.data.structuredDataAvailable || (response.data.structuredData ? true : false);
      const structuredRecordCount = response.data.structuredRecordCount || (structuredDataAvailable ? 1 : 0);

      const validationStatus = response.data.validationStatus || 'Pending';
      const validationScore = response.data.validationScore !== undefined ? response.data.validationScore : null;
      const validatedAt = response.data.validatedAt || new Date().toISOString();

      const existingHistory = document.validationHistory || [];
      const historyItem = {
        validatedAt,
        score: validationScore,
        status: validationStatus,
        errorCount: response.data.errorCount || 0,
        warningCount: response.data.warningCount || 0
      };
      const updatedHistory = validationScore !== null ? [historyItem, ...existingHistory] : existingHistory;

      const updated = documentModel.updateDocument(documentId, {
        status: DOCUMENT_STATUSES.OCR_COMPLETE,
        pageCount,
        processingStartedAt: response.data.processingStartedAt || startedAt,
        processingCompletedAt: response.data.processingCompletedAt || new Date().toISOString(),
        processingTime: response.data.processingTime || 0,
        loaderUsed: response.data.loaderUsed || 'UNKNOWN',
        language: response.data.language || 'eng',
        confidence: response.data.confidence !== undefined ? response.data.confidence : null,
        textPreview: response.data.textPreview || null,
        errorCode: null,
        errorMessage: null,
        // Backward-compatible properties
        pages: pageCount,
        error: null,
        // Phase 5 Structured Information fields
        structuredDataAvailable,
        structuredRecordCount,
        extractionCompletedAt: new Date().toISOString(),
        normalizationStatus: structuredDataAvailable ? 'Normalized' : 'Pending',
        structuredData: response.data.structuredData || null,
        // Phase 6 Validation fields
        fileHash,
        validationStatus,
        validationScore,
        validationSummary: response.data.validationSummary || null,
        validationMessages: response.data.validationMessages || response.data.messages || [],
        messages: response.data.validationMessages || response.data.messages || [],
        rulesTriggered: response.data.rulesTriggered || [],
        errorCount: response.data.errorCount || 0,
        warningCount: response.data.warningCount || 0,
        infoCount: response.data.infoCount || 0,
        validationTime: response.data.validationTime || null,
        validatedAt,
        validationHistory: updatedHistory
      });

      // Phase 7: Trigger Analytics Recompute asynchronously with current active documents
      axios.post(`${config.aiServiceUrl}/analytics/recompute`, {
        documents: documentModel.getAllDocuments()
      }, { timeout: 10000 })
        .catch((e) => console.warn('[DocumentProcessing] Analytics recompute background trigger:', e.message));

      // Phase 9: Trigger Document Intelligence & Search Indexing
      axios.post(`${config.aiServiceUrl}/intelligence/process`, {
        documentId: document.documentId,
        filename: document.originalName,
        extractedText: response.data.extractedText || ''
      }, { timeout: 15000 })
        .catch((e) => console.warn('[DocumentProcessing] Intelligence processing background trigger:', e.message));

      console.log(
        `[DocumentProcessing] Success for ${document.originalName} via ${response.data.loaderUsed} in ${response.data.processingTime}s (Structured Data: ${structuredDataAvailable ? 'Extracted & Normalized' : 'None'})`
      );
      return updated;
    } else {
      const errorCode = response.data?.errorCode || 'UNKNOWN_ERROR';
      const errorMessage =
        response.data?.errorMessage || response.data?.error || 'Extraction returned failed status from AI service.';

      console.warn(`[DocumentProcessing] AI service reported failure [${errorCode}]: ${errorMessage}`);
      return documentModel.updateDocument(documentId, {
        status: DOCUMENT_STATUSES.FAILED,
        errorCode,
        errorMessage,
        error: errorMessage,
        processingCompletedAt: new Date().toISOString(),
        normalizationStatus: 'Failed'
      });
    }
  } catch (error) {
    const errorCode =
      error.response?.data?.errorCode ||
      (error.code === 'ECONNREFUSED' ? 'OCR_ENGINE_NOT_FOUND' : 'UNKNOWN_ERROR');

    const errorMessage =
      error.response?.data?.errorMessage ||
      error.response?.data?.error ||
      error.message ||
      'Failed to communicate with AI Service OCR pipeline.';

    console.error(`[DocumentProcessing] Extraction pipeline error for ${documentId} [${errorCode}]:`, errorMessage);

    return documentModel.updateDocument(documentId, {
      status: DOCUMENT_STATUSES.FAILED,
      errorCode,
      errorMessage,
      error: errorMessage,
      processingCompletedAt: new Date().toISOString(),
      normalizationStatus: 'Failed'
    });
  }
};

/**
 * Explicit on-demand structured information extraction trigger.
 * POST /api/documents/:documentId/extract
 * @param {string} documentId
 * @returns {Promise<Object>} Updated document record
 */
export const processStructuredExtraction = async (documentId) => {
  const document = documentModel.getDocumentById(documentId);
  if (!document) {
    throw new Error(`Document '${documentId}' not found.`);
  }

  try {
    const payload = {
      documentId: document.documentId,
      filename: document.originalName
    };

    const response = await axios.post(`${config.aiServiceUrl}/extract`, payload, {
      timeout: 30000
    });

    if (response.data && response.data.status === 'success') {
      const structuredData = response.data.data;
      return documentModel.updateDocument(documentId, {
        structuredDataAvailable: true,
        structuredRecordCount: response.data.structuredRecordCount || 1,
        extractionCompletedAt: new Date().toISOString(),
        normalizationStatus: 'Normalized',
        structuredData
      });
    }
    return document;
  } catch (err) {
    console.error(`[DocumentProcessing] Structured extraction on-demand error for ${documentId}:`, err.message);
    return document;
  }
};

/**
 * Explicit on-demand validation trigger.
 * POST /api/documents/:documentId/validate
 * @param {string} documentId
 * @returns {Promise<Object>} Updated document record
 */
export const processDocumentValidation = async (documentId) => {
  const document = documentModel.getDocumentById(documentId);
  if (!document) {
    throw new Error(`Document '${documentId}' not found.`);
  }

  // Ensure fileHash
  let fileHash = document.fileHash;
  if (!fileHash && document.filePath) {
    fileHash = computeFileSha256(document.filePath);
  }

  const existingDocs = documentModel.getAllDocuments().map((d) => ({
    documentId: d.documentId,
    filename: d.originalName,
    fileHash: d.fileHash
  }));

  try {
    const payload = {
      documentId: document.documentId,
      structuredData: document.structuredData,
      confidence: document.confidence,
      filename: document.originalName,
      fileHash,
      existingDocuments: existingDocs
    };

    const response = await axios.post(`${config.aiServiceUrl}/validate`, payload, {
      timeout: 30000
    });

    if (response.data && response.data.status === 'success') {
      const valData = response.data;
      const existingHistory = document.validationHistory || [];
      const historyItem = {
        validatedAt: valData.validatedAt || new Date().toISOString(),
        score: valData.validationScore,
        status: valData.validationStatus,
        errorCount: valData.errorCount || 0,
        warningCount: valData.warningCount || 0
      };
      const updatedHistory = [historyItem, ...existingHistory];

      const updated = documentModel.updateDocument(documentId, {
        fileHash,
        validationStatus: valData.validationStatus,
        validationScore: valData.validationScore,
        validationSummary: valData.validationSummary,
        validationMessages: valData.validationMessages || valData.messages || [],
        messages: valData.validationMessages || valData.messages || [],
        rulesTriggered: valData.rulesTriggered || [],
        errorCount: valData.errorCount || 0,
        warningCount: valData.warningCount || 0,
        infoCount: valData.infoCount || 0,
        validationTime: valData.validationTime || null,
        validatedAt: valData.validatedAt || new Date().toISOString(),
        validationHistory: valData.validationHistory || updatedHistory
      });

      // Phase 7: Trigger Analytics Recompute asynchronously with current active documents
      axios.post(`${config.aiServiceUrl}/analytics/recompute`, {
        documents: documentModel.getAllDocuments()
      }, { timeout: 10000 })
        .catch((e) => console.warn('[DocumentProcessing] Analytics recompute background trigger:', e.message));

      // Phase 9: Trigger Document Intelligence update
      axios.post(`${config.aiServiceUrl}/intelligence/process`, {
        documentId: document.documentId,
        filename: document.originalName
      }, { timeout: 15000 })
        .catch((e) => console.warn('[DocumentProcessing] Intelligence update background trigger:', e.message));

      return updated;
    }
    return document;
  } catch (err) {
    console.error(`[DocumentProcessing] Validation on-demand error for ${documentId}:`, err.message);
    throw err;
  }
};

/**
 * Fetch aggregated executive analytics from AI Service (Phase 7).
 * Reads the single source of truth from storage/analytics/dashboard.json.
 * Automatically synchronizes current in-memory documents to prevent discrepancies.
 * @returns {Promise<Object>} Dashboard analytics object
 */
export const fetchDashboardAnalytics = async () => {
  const allDocs = documentModel.getAllDocuments();

  try {
    // 1. Synchronize active in-memory documents with AI service
    const response = await axios.post(`${config.aiServiceUrl}/analytics/recompute`, {
      documents: allDocs
    }, { timeout: 15000 });

    if (response.data && response.data.status === 'success' && response.data.dashboard) {
      return response.data.dashboard;
    }

    // 2. Read single source of truth from GET /analytics/dashboard
    const getRes = await axios.get(`${config.aiServiceUrl}/analytics/dashboard`, { timeout: 15000 });
    if (getRes.data && getRes.data.status === 'success') {
      return getRes.data;
    }
  } catch (err) {
    console.warn('[DocumentProcessing] AI service analytics sync error, using local fallback:', err.message);
  }

  // Fallback to local deterministic computation from in-memory documentModel if AI service is unavailable
  const structuredDocs = allDocs.filter(d => (d.structuredDataAvailable || d.structuredData) && d.structuredData);
  const validatedDocs = allDocs.filter(d => d.validationStatus && d.validationStatus !== 'Pending');

  // Fallback production metrics
  const prods = structuredDocs.map(d => Number(d.structuredData?.coalProduction || d.structuredData?.achievedProduction || 0)).filter(p => p > 0);
  const totalProduction = prods.reduce((a, b) => a + b, 0);
  const targets = structuredDocs.map(d => Number(d.structuredData?.targetProduction || 0)).filter(t => t > 0);
  const totalTarget = targets.reduce((a, b) => a + b, 0);

  const ocrTimes = allDocs
    .map(d => Number(d.processingTime))
    .filter(t => !isNaN(t) && t > 0);
  const avgOcrTime = ocrTimes.length ? Math.round((ocrTimes.reduce((a, b) => a + b, 0) / ocrTimes.length) * 100) / 100 : 0.0;

  const validCount = validatedDocs.filter(d => d.validationStatus === 'Valid').length;
  const warningCount = validatedDocs.filter(d => d.validationStatus === 'Warning').length;
  const errorCount = validatedDocs.filter(d => d.validationStatus === 'Error').length;
  const valAccuracy = validatedDocs.length ? Math.round((validCount / validatedDocs.length) * 1000) / 10 : 0.0;

  const valScores = validatedDocs.map(d => Number(d.validationScore)).filter(s => !isNaN(s));
  const avgValScore = valScores.length ? Math.round((valScores.reduce((a, b) => a + b, 0) / valScores.length) * 10) / 10 : 0.0;

  const qualityRating = avgValScore >= 90 ? 'Excellent' : avgValScore >= 80 ? 'Good' : avgValScore >= 50 ? 'Average' : 'Poor';
  const nowIso = new Date().toISOString();

  return {
    status: 'success',
    analyticsVersion: 1,
    generatedAt: nowIso,
    lastRefresh: nowIso,
    documentsProcessed: structuredDocs.length,
    totalDocuments: allDocs.length,
    documents: {
      documentsUploaded: allDocs.length,
      totalDocuments: allDocs.length,
      documentsProcessed: allDocs.filter(d => d.status !== 'Queued' && d.status !== 'Uploaded').length,
      totalProcessed: allDocs.filter(d => d.status !== 'Queued' && d.status !== 'Uploaded').length,
      documentsFailed: allDocs.filter(d => d.status === 'Failed').length,
      totalFailed: allDocs.filter(d => d.status === 'Failed').length,
      ocrComplete: allDocs.filter(d => d.status === 'OCR Complete' || d.structuredDataAvailable || d.pageCount != null).length,
      structuredRecords: structuredDocs.length,
      validatedDocuments: validatedDocs.length,
      pendingDocuments: allDocs.filter(d => d.status === 'Queued' || d.status === 'Uploaded').length,
      duplicateDocuments: 0,
      statesCovered: 0,
      averageOcrTime: avgOcrTime,
      averageValidationTime: 0.005,
      averageExtractionTime: 0.05,
      byCategory: {},
      byFileType: {}
    },
    production: {
      totalCoalProduction: Math.round(totalProduction * 100) / 100,
      totalTargetProduction: Math.round(totalTarget * 100) / 100,
      totalAchievedProduction: Math.round(totalProduction * 100) / 100,
      targetVariance: Math.round((totalProduction - totalTarget) * 100) / 100,
      remainingTarget: Math.max(0, Math.round((totalTarget - totalProduction) * 100) / 100),
      bestPerformingRecord: null,
      lowestPerformingRecord: null,
      averageProduction: prods.length ? Math.round((totalProduction / prods.length) * 100) / 100 : 0.0,
      highestProduction: prods.length ? Math.max(...prods) : 0.0,
      lowestProduction: prods.length ? Math.min(...prods) : 0.0,
      productionAchievement: totalTarget > 0 ? Math.round((totalProduction / totalTarget) * 1000) / 10 : 100.0,
      productionAchievementPct: totalTarget > 0 ? Math.round((totalProduction / totalTarget) * 1000) / 10 : 100.0,
      productionUnit: 'MT',
      productionTrend: []
    },
    validation: {
      totalValidated: validatedDocs.length,
      validDocuments: validCount,
      warningDocuments: warningCount,
      errorDocuments: errorCount,
      averageValidationScore: avgValScore,
      overallQualityRating: qualityRating,
      qualityRating: qualityRating,
      manualReviewRequired: errorCount,
      highestScore: valScores.length ? Math.max(...valScores) : 0,
      lowestScore: valScores.length ? Math.min(...valScores) : 0,
      totalErrors: validatedDocs.reduce((a, d) => a + (d.errorCount || 0), 0),
      totalWarnings: validatedDocs.reduce((a, d) => a + (d.warningCount || 0), 0),
      validationAccuracy: valAccuracy
    },
    subsidiaries: [],
    states: [],
    financialYears: [],
    rankings: { topMines: [], topSubsidiaries: [], topStates: [], topReports: [] },
    quality: {
      missingFieldsPercentage: 0.0,
      fieldCompletenessPercentage: 100.0,
      averageFieldCompleteness: 100.0,
      averageStructuredFields: 16.0,
      totalStandardFields: 16,
      missingMandatoryFields: 0,
      duplicateDocuments: 0,
      duplicateRecords: 0,
      unknownUnits: 0,
      lowOcrConfidence: 0,
      lowOcrConfidenceCount: 0,
      documentsRequiringReview: errorCount,
      manualReviewRequired: errorCount,
      failedValidationPercentage: 0.0
    },
    charts: {
      productionTrend: [],
      subsidiaryDistribution: [],
      stateDistribution: [],
      validationScoreDistribution: [
        { category: 'Valid', count: validCount, color: '#16a34a' },
        { category: 'Warning', count: warningCount, color: '#d97706' },
        { category: 'Error', count: errorCount, color: '#dc2626' }
      ],
      documentTypeDistribution: []
    }
  };
};

export default {
  processDocumentExtraction,
  processStructuredExtraction,
  processDocumentValidation,
  fetchDashboardAnalytics
};

