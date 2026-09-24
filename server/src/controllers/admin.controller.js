import adminService from '../services/admin.service.js';

export const getHealthAction = async (req, res) => {
  try {
    const result = await adminService.getHealth();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[AdminController] getHealth error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve system health.'
    });
  }
};

export const getStatisticsAction = async (req, res) => {
  try {
    const result = await adminService.getStatistics();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[AdminController] getStatistics error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve processing statistics.'
    });
  }
};

export const getStorageAction = async (req, res) => {
  try {
    const result = await adminService.getStorage();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[AdminController] getStorage error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve storage metrics.'
    });
  }
};

export const getRuntimeAction = async (req, res) => {
  try {
    const result = await adminService.getRuntime();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[AdminController] getRuntime error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve runtime metrics.'
    });
  }
};

export const getConfigurationAction = async (req, res) => {
  try {
    const result = await adminService.getConfiguration();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[AdminController] getConfiguration error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve platform configuration.'
    });
  }
};

export const getActivityAction = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 25;
    const result = await adminService.getActivity(limit);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[AdminController] getActivity error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve activity stream.'
    });
  }
};

export const getAuditAction = async (req, res) => {
  try {
    const { module, status, date, limit } = req.query;
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const result = await adminService.getAudit({ module, status, date, limit: parsedLimit });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[AdminController] getAudit error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to retrieve audit events.'
    });
  }
};

export const clearAuditAction = async (req, res) => {
  try {
    const result = await adminService.clearAudit();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[AdminController] clearAudit error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to clear audit history.'
    });
  }
};

export const refreshSystemAction = async (req, res) => {
  try {
    const user = req.body?.user || req.user?.username || 'System Administrator';
    const result = await adminService.refreshSystem(user);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[AdminController] refreshSystem error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to perform administrative refresh.'
    });
  }
};
