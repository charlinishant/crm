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

exports.updateLeadNote = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "note id is required" });

    const data = {};
    if (typeof req.body.note === "string" && req.body.note.trim()) data.note = req.body.note.trim();
    if (typeof req.body.pinned === "boolean") data.pinned = req.body.pinned;
    const note = await prisma.leadNote.update({ where: { id }, data });
    return res.status(200).json(note);
  } catch (err) {
    console.error("Update lead note error:", err);
    return res.status(500).json({ message: "something went wrong" });
  }
};

exports.deleteLeadNote = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "note id is required" });
    await prisma.leadNote.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error("Delete lead note error:", err);
    return res.status(500).json({ message: "something went wrong" });
  }
};
