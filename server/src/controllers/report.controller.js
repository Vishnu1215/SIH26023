import reportService from '../services/report.service.js';

export const generateReport = async (req, res, next) => {
  try {
    const { reportType, format, filters, customSections } = req.body;
    const generatedBy = req.user ? `${req.user.name || req.user.username || 'Officer'} (${req.user.role || 'Executive'})` : 'Executive User';

    const result = await reportService.generateReport({
      reportType,
      format,
      filters,
      customSections,
      generatedBy
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('[ReportController] generateReport error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Report generation failed.'
    });
  }
};

export const getReports = async (req, res, next) => {
  try {
    const result = await reportService.getReports();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[ReportController] getReports error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to fetch reports.'
    });
  }
};

export const getReportById = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const result = await reportService.getReportById(reportId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[ReportController] getReportById error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 404).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Report not found.'
    });
  }
};

export const downloadReportFile = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const axiosResponse = await reportService.downloadReportFile(reportId);

    // Forward headers
    if (axiosResponse.headers['content-type']) {
      res.setHeader('Content-Type', axiosResponse.headers['content-type']);
    }
    if (axiosResponse.headers['content-disposition']) {
      res.setHeader('Content-Disposition', axiosResponse.headers['content-disposition']);
    }

    axiosResponse.data.pipe(res);
  } catch (error) {
    console.error('[ReportController] downloadReportFile error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to download report file.'
    });
  }
};

export const previewReport = async (req, res, next) => {
  try {
    const { reportType, filters, customSections } = req.body;
    const html = await reportService.previewReport({
      reportType,
      filters,
      customSections
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error('[ReportController] previewReport error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Preview generation failed.'
    });
  }
};

export const previewExistingReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const html = await reportService.previewExistingReport(reportId);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error('[ReportController] previewExistingReport error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Preview generation failed.'
    });
  }
};

export const regenerateReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const result = await reportService.regenerateReport(reportId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[ReportController] regenerateReport error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Report regeneration failed.'
    });
  }
};

export const deleteReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const result = await reportService.deleteReport(reportId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[ReportController] deleteReport error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Failed to delete report.'
    });
  }
};
