const reportService = require("../services/adminReport.service")

const sendReport = (handler) => async (req, res) => {
  try {
    const data = await handler(req.query || {})
    res.status(200).json({ data })
  } catch (error) {
    console.error("Admin report error:", error)
    res.status(500).json({ message: error.message || "Unable to load report data" })
  }
}

exports.getSummary = sendReport(reportService.getSummary)
exports.getLeadStatus = sendReport(reportService.getLeadStatus)
exports.getMonthlyLeads = sendReport(reportService.getMonthlyLeads)
exports.getSalesPerformance = sendReport(reportService.getSalesPerformance)
exports.getFollowups = sendReport(reportService.getFollowups)
exports.getLeadSources = sendReport(reportService.getLeadSources)
exports.getSiteVisits = sendReport(reportService.getSiteVisits)
exports.getBookings = sendReport(reportService.getBookings)
exports.getRecentActivities = sendReport(reportService.getRecentActivities)
