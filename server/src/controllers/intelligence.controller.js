import intelligenceService from '../services/intelligence.service.js';

export const processIntelligenceAction = async (req, res, next) => {
  try {
    const { documentId, extractedText, filename } = req.body;
    if (!documentId) {
      return res.status(400).json({ success: false, message: "documentId is required." });
    }

    const result = await intelligenceService.processIntelligence({
      documentId,
      extractedText,
      filename
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[IntelligenceController] processIntelligence error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Intelligence processing failed.'
    });
  }
};

export const getIntelligenceAction = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const result = await intelligenceService.getIntelligence(documentId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[IntelligenceController] getIntelligence error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 404).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Intelligence metadata not found.'
    });
  }
};

export const searchDocumentsAction = async (req, res, next) => {
  try {
    const { query, mine, subsidiary, state, financialYear, category, topic, limit } = req.query;
    const result = await intelligenceService.searchDocuments({
      query,
      mine,
      subsidiary,
      state,
      financialYear,
      category,
      topic,
      limit
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[IntelligenceController] searchDocuments error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Search execution failed.'
    });
  }
};

export const reindexSearchAction = async (req, res, next) => {
  try {
    const result = await intelligenceService.reindexSearch();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[IntelligenceController] reindexSearch error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Re-indexing failed.'
    });
  }
};
