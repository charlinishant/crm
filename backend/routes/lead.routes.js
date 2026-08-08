const {Router} = require("express")
const multer = require("multer")

const authenticate = require("../middleware/auth.middleware")
const { optionalAuthenticate } = require("../middleware/auth.middleware")
const {createLead, getLeads, getDuplicateLeads, getTrashLeads, getLeadById, updateLead, deleteLead, restoreLead, permanentlyDeleteLead, bulkTrashLeads, bulkRestoreLeads, bulkPermanentlyDeleteLeads, importExcel, sampleExcel} = require("../controllers/lead.controller")

const router = Router()

// router.use(authenticate)

const upload = multer({
    storage: multer.memoryStorage()
})  


router.post("/", optionalAuthenticate, createLead)
router.get("/", getLeads)
router.get("/duplicates", getDuplicateLeads)
router.get("/trash", getTrashLeads)
router.get('/sample-excel', sampleExcel)
router.post('/import',upload.single("file"), importExcel)
router.patch("/bulk/trash", authenticate, bulkTrashLeads)
router.patch("/bulk/restore", authenticate, bulkRestoreLeads)
router.delete("/bulk/permanent", authenticate, bulkPermanentlyDeleteLeads)
router.get("/:id", getLeadById)
router.patch("/:id", updateLead)
router.patch("/:id/restore", restoreLead)
router.delete("/:id", deleteLead)
router.delete("/:id/permanent", permanentlyDeleteLead)

module.exports = router
