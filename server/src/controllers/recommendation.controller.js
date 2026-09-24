import recommendationService from '../services/recommendation.service.js';

export const getRecommendationsAction = async (req, res, next) => {
  try {
    const { category, priority, subsidiary } = req.query;
    const result = await recommendationService.getRecommendations({ category, priority, subsidiary });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[RecommendationController] getRecommendations error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve recommendations.'
    });
  }
};

export const getInsightsAction = async (req, res, next) => {
  try {
    const result = await recommendationService.getInsights();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[RecommendationController] getInsights error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve executive insights.'
    });
  }
};

export const getAlertsAction = async (req, res, next) => {
  try {
    const { severity } = req.query;
    const result = await recommendationService.getAlerts(severity);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[RecommendationController] getAlerts error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve alerts.'
    });
  }
};

export const getRiskAction = async (req, res, next) => {
  try {
    const result = await recommendationService.getRiskAssessment();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[RecommendationController] getRisk error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve operational risk.'
    });
  }
};

export const getTrendsAction = async (req, res, next) => {
  try {
    const result = await recommendationService.getTrends();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[RecommendationController] getTrends error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve trend analysis.'
    });
  }
};

export const recomputeRecommendationsAction = async (req, res, next) => {
  try {
    const result = await recommendationService.recomputeRecommendations();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[RecommendationController] recompute error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to recompute recommendations.'
    });
  }
};

export const getHistoryAction = async (req, res, next) => {
  try {
    const result = await recommendationService.getHistory();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[RecommendationController] getHistory error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve recommendations history.'
    });
  }
};
