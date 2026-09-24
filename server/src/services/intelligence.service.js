import axios from 'axios';
import { config } from '../config/index.js';

/**
 * Service to interface with FastAPI Phase 9 Document Intelligence & Search.
 */
class IntelligenceService {
  constructor() {
    this.aiBaseUrl = config.aiServiceUrl;
  }

  /**
   * Process document intelligence for a specific document (or 'all')
   */
  async processIntelligence({ documentId, extractedText = '', filename = '' }) {
    const response = await axios.post(`${this.aiBaseUrl}/intelligence/process`, {
      documentId,
      extractedText,
      filename
    }, {
      timeout: 30000
    });
    return response.data;
  }

  /**
   * Fetch semantic intelligence metadata for a document
   */
  async getIntelligence(documentId) {
    const response = await axios.get(`${this.aiBaseUrl}/intelligence/${documentId}`, {
      timeout: 15000
    });
    return response.data;
  }

  /**
   * Query pure JSON search index
   */
  async searchDocuments(params = {}) {
    const response = await axios.get(`${this.aiBaseUrl}/search`, {
      params,
      timeout: 15000
    });
    return response.data;
  }

  /**
   * Trigger search index rebuild
   */
  async reindexSearch() {
    const response = await axios.post(`${this.aiBaseUrl}/search/reindex`, {}, {
      timeout: 30000
    });
    return response.data;
  }
}

export default new IntelligenceService();
