import axios from 'axios';
import { config } from '../config/index.js';

/**
 * Service to interface with FastAPI Phase 10 Natural Language Query Engine.
 */
class QueryService {
  constructor() {
    this.aiBaseUrl = config.aiServiceUrl;
  }

  /**
   * Execute natural language query over documents and analytics
   */
  async processQuery({ query, documentId = null }) {
    const response = await axios.post(`${this.aiBaseUrl}/query`, {
      query,
      documentId
    }, {
      timeout: 15000
    });
    return response.data;
  }

  /**
   * Retrieve query history
   */
  async getQueryHistory() {
    const response = await axios.get(`${this.aiBaseUrl}/query/history`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Clear query history
   */
  async clearQueryHistory() {
    const response = await axios.delete(`${this.aiBaseUrl}/query/history`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Retrieve query suggestions
   */
  async getQuerySuggestions() {
    const response = await axios.get(`${this.aiBaseUrl}/query/suggestions`, {
      timeout: 10000
    });
    return response.data;
  }
}

export default new QueryService();
