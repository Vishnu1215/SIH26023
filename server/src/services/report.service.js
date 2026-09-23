import axios from 'axios';
import { config } from '../config/index.js';

/**
 * Service to interface with FastAPI Phase 8 Report Generation endpoints.
 */
class ReportService {
  constructor() {
    this.baseUrl = `${config.aiServiceUrl}/reports`;
  }

  /**
   * Request report generation from AI service
   */
  async generateReport({ reportType, format, filters, customSections, generatedBy }) {
    const response = await axios.post(`${this.baseUrl}/generate`, {
      reportType,
      format,
      filters: filters || {},
      customSections: customSections || [],
      generatedBy: generatedBy || 'Executive User'
    }, {
      timeout: 60000 // 60s timeout for complex PDF rendering
    });
    return response.data;
  }

  /**
   * Fetch report history
   */
  async getReports() {
    const response = await axios.get(`${this.baseUrl}`, {
      timeout: 15000
    });
    return response.data;
  }

  /**
   * Fetch metadata for a specific report
   */
  async getReportById(reportId) {
    const response = await axios.get(`${this.baseUrl}/${reportId}`, {
      timeout: 15000
    });
    return response.data;
  }

  /**
   * Stream report file binary
   */
  async downloadReportFile(reportId) {
    const response = await axios.get(`${this.baseUrl}/${reportId}/file`, {
      responseType: 'stream',
      timeout: 30000
    });
    return response;
  }

  /**
   * Get HTML preview for specific parameters
   */
  async previewReport({ reportType, filters, customSections }) {
    const response = await axios.post(`${this.baseUrl}/preview`, {
      reportType,
      filters: filters || {},
      customSections: customSections || []
    }, {
      headers: { 'Accept': 'text/html' },
      responseType: 'text',
      timeout: 20000
    });
    return response.data;
  }

  /**
   * Get HTML preview for an existing saved report
   */
  async previewExistingReport(reportId) {
    const response = await axios.get(`${this.baseUrl}/${reportId}/preview`, {
      headers: { 'Accept': 'text/html' },
      responseType: 'text',
      timeout: 20000
    });
    return response.data;
  }

  /**
   * Regenerate report with updated data
   */
  async regenerateReport(reportId) {
    const response = await axios.post(`${this.baseUrl}/${reportId}/regenerate`, {}, {
      timeout: 60000
    });
    return response.data;
  }

  /**
   * Delete report
   */
  async deleteReport(reportId) {
    const response = await axios.delete(`${this.baseUrl}/${reportId}`, {
      timeout: 15000
    });
    return response.data;
  }
}

export default new ReportService();
