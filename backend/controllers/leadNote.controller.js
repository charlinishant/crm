const prisma = require("../lib/prisma");

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  "";

exports.createLeadNote = async (req, res) => {
  try {
    const { leadId, note, owner } = req.body;

    if (!leadId || !note || !note.trim()) {
      return res.status(400).json({ message: "leadId and note are required" });
    }

    const normalizedLeadId = Number(leadId);
    const noteText = note.trim();
    const authUserId = req.authUser?.id ? Number(req.authUser.id) : null;
    const authUser = authUserId
      ? await prisma.user.findUnique({
        where: { id: authUserId },
        select: { id: true, firstName: true, lastName: true, username: true, email: true },
      })
      : null;
    const noteOwner = owner || getUserName(authUser) || null;

    const result = await prisma.$transaction(async (tx) => {
      const savedNote = await tx.leadNote.create({
        data: {
          leadId: normalizedLeadId,
          note: noteText,
          owner: noteOwner,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: normalizedLeadId,
          userId: authUser?.id || null,
          type: "Note Added",
          message: noteText,
        },
      });

      return savedNote;
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
