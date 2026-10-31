const reportService = require("../services/adminReport.service")
const callReportService = require("../services/callReport.service")
const dprReportService = require("../services/dprReport.service")
const leadSourceReportService = require("../services/leadSourceReport.service")

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
    const includeAdmin = req.query.includeAdmin === "true"
    const data = await reportService.getSalesUsers({ includeAdmin })
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


// DPR (Daily Performance Report)
exports.getDprReport = async (req, res) => {
  try {
    const data = await dprReportService.getDprData(req.query || {});
    res.status(200).json({ data });
  } catch (error) {
    console.error("DPR report error:", error);
    res.status(500).json({ message: error.message || "Unable to load DPR report data" });
  }
};

exports.exportDprExcel = async (req, res) => {
  try {
    const buffer = await dprReportService.generateDprExcelBuffer(req.query || {});
    const { fromDate, toDate } = dprReportService.getISTDateBoundaries(req.query?.fromDate, req.query?.toDate);
    const filename = "DPR_Report_" + fromDate + "_to_" + toDate + ".xlsx";

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');
    res.status(200).send(buffer);
  } catch (error) {
    console.error("DPR Excel export error:", error);
    res.status(500).json({ message: error.message || "Unable to generate DPR Excel report" });
  }
};

exports.getDprDrilldown = async (req, res) => {
  try {
    const data = await dprReportService.getDprDrilldown(req.query || {});
    res.status(200).json({ data });
  } catch (error) {
    console.error("DPR drilldown error:", error);
    res.status(500).json({ message: error.message || "Unable to load DPR drilldown data" });
  }
};

// Lead Source & Channel Partner Performance Report
exports.getLeadSourceReport = async (req, res) => {
  try {
    const data = await leadSourceReportService.getLeadSourceReportData(req.query || {}, req.user);
    res.status(200).json({ data });
  } catch (error) {
    console.error("Lead source report error:", error);
    res.status(500).json({ message: error.message || "Unable to load Lead Source report data" });
  }
};

exports.exportLeadSourceExcel = async (req, res) => {
  try {
    const buffer = await leadSourceReportService.generateSourceExcelBuffer(req.query || {}, req.user);
    const { fromDate, toDate } = dprReportService.getISTDateBoundaries(req.query?.fromDate, req.query?.toDate);
    const specificSource = req.query?.sourceName ? "_" + req.query.sourceName.replace(/[^a-zA-Z0-9]/g, "_") : "";
    const filename = "Lead_Source_Performance" + specificSource + "_" + fromDate + "_to_" + toDate + ".xlsx";

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Lead source Excel export error:", error);
    res.status(500).json({ message: error.message || "Unable to generate Lead Source Excel report" });
  }
};

exports.getLeadSourceDrilldown = async (req, res) => {
  try {
    const data = await leadSourceReportService.getLeadSourceDrilldown(req.query || {});
    res.status(200).json({ data });
  } catch (error) {
    console.error("Lead source drilldown error:", error);
    res.status(500).json({ message: error.message || "Unable to load Lead Source drilldown data" });
  }
};

exports.mergeLeadSources = async (req, res) => {
  try {
    const result = await leadSourceReportService.mergeLeadSources({
      ...req.body,
      adminUserId: req.user?.id,
    });
    res.status(200).json({ data: result });
  } catch (error) {
    console.error("Merge lead sources error:", error);
    res.status(500).json({ message: error.message || "Unable to merge lead sources" });
  }
};

exports.autoCleanLeadSources = async (req, res) => {
  try {
    const result = await leadSourceReportService.autoCleanLeadSources(req.user?.id);
    res.status(200).json({ data: result });
  } catch (error) {
    console.error("Auto-clean lead sources error:", error);
    res.status(500).json({ message: error.message || "Unable to auto-clean lead sources" });
  }
};
