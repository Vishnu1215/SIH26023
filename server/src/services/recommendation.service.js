import axios from 'axios';
import { config } from '../config/index.js';

/**
 * Service to interface with FastAPI Phase 12 AI Recommendations & Decision Support Engine.
 */
class RecommendationService {
  constructor() {
    this.aiBaseUrl = config.aiServiceUrl;
  }

  /**
   * Fetch full recommendations payload with optional category/priority/subsidiary filters
   */
  async getRecommendations({ category, priority, subsidiary } = {}) {
    const params = {};
    if (category) params.category = category;
    if (priority) params.priority = priority;
    if (subsidiary) params.subsidiary = subsidiary;

    const response = await axios.get(`${this.aiBaseUrl}/recommendations`, {
      params,
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Fetch executive insights
   */
  async getInsights() {
    const response = await axios.get(`${this.aiBaseUrl}/recommendations/insights`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Fetch operational alerts with optional severity filter
   */
  async getAlerts(severity) {
    const params = severity ? { severity } : {};
    const response = await axios.get(`${this.aiBaseUrl}/recommendations/alerts`, {
      params,
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Fetch operational risk assessment
   */
  async getRiskAssessment() {
    const response = await axios.get(`${this.aiBaseUrl}/recommendations/risk`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Fetch historical trend analysis
   */
  async getTrends() {
    const response = await axios.get(`${this.aiBaseUrl}/recommendations/trends`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Force recompute recommendations from single sources of truth
   */
  async recomputeRecommendations() {
    const response = await axios.post(`${this.aiBaseUrl}/recommendations/recompute`, {}, {
      timeout: 15000
    });
    return response.data;
  }

  /**
   * Fetch historical snapshots
   */
  async getHistory() {
    const response = await axios.get(`${this.aiBaseUrl}/recommendations/history`, {
      timeout: 10000
    });
    return response.data;
  }
}

export default new RecommendationService();
