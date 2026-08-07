const { Router } = require("express");
const { createLeadNote, getLeadNotes, updateLeadNote, deleteLeadNote } = require("../controllers/leadNote.controller");

const router = Router();

router.get("/:leadId", getLeadNotes);
router.post("/", createLeadNote);
router.patch("/:id", updateLeadNote);
router.delete("/:id", deleteLeadNote);

module.exports = router;
