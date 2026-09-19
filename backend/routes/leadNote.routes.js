const { Router } = require("express");
const { optionalAuthenticate } = require("../middleware/auth.middleware");
const { createLeadNote, getLeadNotes, updateLeadNote, deleteLeadNote } = require("../controllers/leadNote.controller");

const router = Router();

router.get("/:leadId", optionalAuthenticate, getLeadNotes);
router.post("/", optionalAuthenticate, createLeadNote);
router.patch("/:id", optionalAuthenticate, updateLeadNote);
router.delete("/:id", optionalAuthenticate, deleteLeadNote);

module.exports = router;
