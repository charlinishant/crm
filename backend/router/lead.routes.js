const {Router} = require("express")

const {createLead, getLeads, getLeadById, updateLead, deleteLead} = require("../controller/lead.controller")

const router = Router()

router.post("/", createLead)
router.get("/", getLeads)
router.get("/:id", getLeadById)
router.patch("/:id", updateLead)
router.delete("/:id", deleteLead)

module.exports = router