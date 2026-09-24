import axios from 'axios';
import { config } from '../config/index.js';

/**
 * Service to interface with FastAPI Phase 11: Hybrid AI Question Answering.
 */
class QAService {
  constructor() {
    this.aiBaseUrl = config.aiServiceUrl;
  }

  /**
   * Execute Hybrid QA query
   */
  async processQA({ question, useLLM = false, documentId = null, filters = null }) {
    const response = await axios.post(`${this.aiBaseUrl}/qa/query`, {
      question,
      useLLM,
      documentId,
      filters
    }, {
      timeout: 20000
    });
    return response.data;
  }

  /**
   * Retrieve QA chat history
   */
  async getQAHistory() {
    const response = await axios.get(`${this.aiBaseUrl}/qa/history`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Clear QA chat history
   */
  async clearQAHistory() {
    const response = await axios.delete(`${this.aiBaseUrl}/qa/history`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Retrieve dynamic QA suggestions
   */
  async getQASuggestions() {
    const response = await axios.get(`${this.aiBaseUrl}/qa/suggestions`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Explain query rationale and data sources
   */
  async explainQA({ question, documentId = null }) {
    const response = await axios.post(`${this.aiBaseUrl}/qa/explain`, {
      question,
      documentId
    }, {
      timeout: 15000
    });
    return response.data;
  }

  /**
   * Get QA engine readiness status
   */
  async getQAStatus() {
    const response = await axios.get(`${this.aiBaseUrl}/qa/status`, {
      timeout: 10000
    });
    return response.data;
  }
}

export default new QAService();
