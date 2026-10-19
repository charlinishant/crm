const reportService = require("../services/adminReport.service")
const callReportService = require("../services/callReport.service")

const sendReport = (handler) => async (req, res) => {
  try {
    const data = await handler(req.query || {})
    res.status(200).json({ data })
  } catch (error) {
    console.error("Admin report error:", error)
    res.status(500).json({ message: error.message || "Unable to load report data" })
  }
}

// Lead & Funnel Reports
exports.getSummary = sendReport(reportService.getSummary)
exports.getLeadStatus = sendReport(reportService.getLeadStatus)
exports.getMonthlyLeads = sendReport(reportService.getMonthlyLeads)
exports.getSalesPerformance = sendReport(reportService.getSalesPerformance)
exports.getSalesUsers = async (req, res) => {
  try {
    const data = await reportService.getSalesUsers()
    res.status(200).json({ data })
  } catch (error) {
    console.error("Sales users error:", error)
    res.status(500).json({ message: error.message || "Unable to load sales users" })
  }
}
exports.getFollowups = sendReport(reportService.getFollowups)
exports.getLeadSources = sendReport(reportService.getLeadSources)
exports.getSiteVisits = sendReport(reportService.getSiteVisits)
exports.getBookings = sendReport(reportService.getBookings)
exports.getRecentActivities = sendReport(reportService.getRecentActivities)
exports.getDrilldownLeads = async (req, res) => {
  try {
    const data = await reportService.getDrilldownLeads(req.query || {}, req)
    res.status(200).json({ data })
  } catch (error) {
    console.error("Drilldown report error:", error)
    res.status(500).json({ message: error.message || "Unable to load drilldown leads" })
  }
}

// Mcube Call / Telephony Reports
exports.getTelephonySummary = sendReport(callReportService.getCallSummary)
exports.getCallStatus = sendReport(callReportService.getCallStatusDistribution)
exports.getCallHourly = sendReport(callReportService.getCallHourlyDistribution)
exports.getCallDaily = sendReport(callReportService.getCallDailyDistribution)
exports.getDidBreakup = sendReport(callReportService.getDidBreakup)
exports.getAgentCallPerformance = sendReport(callReportService.getAgentCallPerformance)
exports.getCallLogs = sendReport(callReportService.getCallDetailRecords)
exports.getDrilldownCalls = async (req, res) => {
  try {
    const data = await callReportService.getDrilldownCalls(req.query || {}, req)
    res.status(200).json({ data })
  } catch (error) {
    console.error("Drilldown calls report error:", error)
    res.status(500).json({ message: error.message || "Unable to load drilldown calls" })
  }
}

exports.syncMcubeCdr = async (req, res) => {
  try {
    const data = await callReportService.syncMcubeCdr(req.body || req.query || {})
    res.status(200).json({ data })
  } catch (error) {
    console.error("MCube CDR sync error:", error)
    res.status(500).json({ message: error.message || "Unable to sync MCube CDR" })
  }
}
