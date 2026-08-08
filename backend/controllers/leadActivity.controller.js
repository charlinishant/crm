const prisma = require("../lib/prisma");

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  (lead?.id ? `Lead #${lead.id}` : "Lead");

exports.createLeadActivity = async (req, res) => {
  try {
    const { leadId, type, title, description, message, oldStatus, newStatus } = req.body;
    const normalizedLeadId = Number(leadId);

    if (!normalizedLeadId || !type || !(message || description || title)) {
      return res.status(400).json({ message: "leadId, type, and activity message are required" });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: normalizedLeadId },
      select: { id: true, firstName: true, lastName: true, companyName: true },
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const activity = await prisma.leadActivity.create({
      data: {
        leadId: normalizedLeadId,
        userId: req.authUser?.id || null,
        type: String(type),
        message: String(message || description || title),
        oldStatus: oldStatus || null,
        newStatus: newStatus || null,
      },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, companyName: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true, role: true },
        },
      },
    });

    res.status(201).json({
      ...activity,
      title: title || type,
      description: activity.message,
      leadName: getLeadName(activity.lead),
    });
  } catch (err) {
    console.error("Create lead activity error:", err);
    res.status(500).json({ message: "something went wrong" });
  }
};

exports.getLeadActivities = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const leadId = req.query.leadId ? Number(req.query.leadId) : null;

    const activities = await prisma.leadActivity.findMany({
      where: leadId ? { leadId } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, companyName: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true, role: true },
        },
      },
    });

    res.status(200).json(activities.map((activity) => ({
      id: activity.id,
      leadId: activity.leadId,
      leadName: getLeadName(activity.lead),
      title: activity.type,
      description: activity.message,
      meta: `Done by ${
        [activity.user?.firstName, activity.user?.lastName].filter(Boolean).join(" ") ||
        activity.user?.username ||
        activity.user?.email ||
        "Sales User"
      }`,
      type: activity.type,
      actorName:
        [activity.user?.firstName, activity.user?.lastName].filter(Boolean).join(" ") ||
        activity.user?.username ||
        activity.user?.email ||
        "Sales User",
      actorRole: activity.user?.role || "",
      createdAt: activity.createdAt,
      oldStatus: activity.oldStatus,
      newStatus: activity.newStatus,
    })));
  } catch (err) {
    console.error("Get lead activities error:", err);
    res.status(500).json({ message: "something went wrong" });
  }
};
