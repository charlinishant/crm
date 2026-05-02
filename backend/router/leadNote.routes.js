const { Router } = require("express");
const { createLeadNote, getLeadNotes } = require("../controller/leadNote.controller");

const router = Router();

router.get("/:leadId", getLeadNotes);
router.post("/", createLeadNote);

module.exports = router;
