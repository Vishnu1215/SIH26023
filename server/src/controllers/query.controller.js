import queryService from '../services/query.service.js';

export const executeQueryAction = async (req, res, next) => {
  try {
    const { query, documentId } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ success: false, message: 'A non-empty query string is required.' });
    }

    const result = await queryService.processQuery({
      query: query.trim(),
      documentId: documentId || null
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[QueryController] executeQuery error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Query execution failed.'
    });
  }
};

export const getQueryHistoryAction = async (req, res, next) => {
  try {
    const result = await queryService.getQueryHistory();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[QueryController] getQueryHistory error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve query history.'
    });
  }
};

export const clearQueryHistoryAction = async (req, res, next) => {
  try {
    const result = await queryService.clearQueryHistory();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[QueryController] clearQueryHistory error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to clear query history.'
    });
  }
};

export const getQuerySuggestionsAction = async (req, res, next) => {
  try {
    const result = await queryService.getQuerySuggestions();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[QueryController] getQuerySuggestions error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve query suggestions.'
    });
  }
};
