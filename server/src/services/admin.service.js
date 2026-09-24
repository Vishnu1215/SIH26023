import axios from 'axios';
import { config } from '../config/index.js';

/**
 * Service to interface with FastAPI Phase 13 System Administration, Audit & Monitoring Engine.
 */
class AdminService {
  constructor() {
    this.aiBaseUrl = config.aiServiceUrl;
  }

  /**
   * Fetch real-time system health and subsystem availability
   */
  async getHealth() {
    const response = await axios.get(`${this.aiBaseUrl}/admin/health`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Fetch aggregated processing and pipeline statistics
   */
  async getStatistics() {
    const response = await axios.get(`${this.aiBaseUrl}/admin/statistics`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Fetch storage breakdown, folder metrics, and largest files
   */
  async getStorage() {
    const response = await axios.get(`${this.aiBaseUrl}/admin/storage`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Fetch runtime latencies and performance metrics
   */
  async getRuntime() {
    const response = await axios.get(`${this.aiBaseUrl}/admin/runtime`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Fetch read-only system configuration profiles
   */
  async getConfiguration() {
    const response = await axios.get(`${this.aiBaseUrl}/admin/configuration`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Fetch unified multi-source activity stream
   */
  async getActivity(limit = 25) {
    const response = await axios.get(`${this.aiBaseUrl}/admin/activity`, {
      params: { limit },
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Fetch government compliance audit events
   */
  async getAudit({ module, status, date, limit = 100 } = {}) {
    const params = { limit };
    if (module) params.module = module;
    if (status) params.status = status;
    if (date) params.date = date;

    const response = await axios.get(`${this.aiBaseUrl}/admin/audit`, {
      params,
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Clear audit log history
   */
  async clearAudit() {
    const response = await axios.delete(`${this.aiBaseUrl}/admin/audit`, {
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Trigger administrative cache and storage refresh
   */
  async refreshSystem(user = 'System Administrator') {
    const response = await axios.post(`${this.aiBaseUrl}/admin/refresh`, { user }, {
      timeout: 15000
    });
    return response.data;
  }
}

export default new AdminService();
