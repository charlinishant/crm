const prisma = require("../lib/prisma");

exports.createLeadNote = async (req, res) => {
  try {
    const { leadId, note, owner } = req.body;

    if (!leadId || !note || !note.trim()) {
      return res.status(400).json({ message: "leadId and note are required" });
    }

    const result = await prisma.leadNote.create({
      data: {
        leadId: Number(leadId),
        note: note.trim(),
        owner: owner || null,
      },
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Create lead note error:", err);
    res.status(500).json({ message: "something went wrong" });
  }
};

exports.getLeadNotes = async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);

    if (!leadId) {
      return res.status(400).json({ message: "leadId is required" });
    }

    const notes = await prisma.leadNote.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(notes);
  } catch (err) {
    console.error("Get lead notes error:", err);
    res.status(500).json({ message: "something went wrong" });
  }
};
