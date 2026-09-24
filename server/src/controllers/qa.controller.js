import qaService from '../services/qa.service.js';

export const executeQAAction = async (req, res, next) => {
  try {
    const { question, useLLM, documentId, filters } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ success: false, message: 'A non-empty question string is required.' });
    }

    const result = await qaService.processQA({
      question: question.trim(),
      useLLM: Boolean(useLLM),
      documentId: documentId || null,
      filters: filters || null
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[QAController] executeQA error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'QA execution failed.'
    });
  }
};

export const getQAHistoryAction = async (req, res, next) => {
  try {
    const result = await qaService.getQAHistory();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[QAController] getQAHistory error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve QA history.'
    });
  }
};

export const clearQAHistoryAction = async (req, res, next) => {
  try {
    const result = await qaService.clearQAHistory();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[QAController] clearQAHistory error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to clear QA history.'
    });
  }
};

export const getQASuggestionsAction = async (req, res, next) => {
  try {
    const result = await qaService.getQASuggestions();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[QAController] getQASuggestions error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve QA suggestions.'
    });
  }
};

export const explainQAAction = async (req, res, next) => {
  try {
    const { question, documentId } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ success: false, message: 'A non-empty question string is required.' });
    }

    const result = await qaService.explainQA({
      question: question.trim(),
      documentId: documentId || null
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[QAController] explainQA error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to explain QA query.'
    });
  }
};

export const getQAStatusAction = async (req, res, next) => {
  try {
    const result = await qaService.getQAStatus();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[QAController] getQAStatus error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to get QA status.'
    });
  }
};
