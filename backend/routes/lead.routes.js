const {Router} = require("express")
const multer = require("multer")

const authenticate = require("../middleware/auth.middleware")
const { optionalAuthenticate } = require("../middleware/auth.middleware")
const {
  createLead,
  getLeads,
  getUntaggedLeads,
  tagLeadSource,
  bulkTagLeadSources,
  getDuplicateLeads,
  getTrashLeads,
  getLeadById,
  updateLead,
  deleteLead,
  restoreLead,
  permanentlyDeleteLead,
  bulkTrashLeads,
  bulkRestoreLeads,
  bulkPermanentlyDeleteLeads,
  importExcel,
  sampleExcel,
} = require("../controllers/lead.controller")

const router = Router()

// router.use(authenticate)

const upload = multer({
    storage: multer.memoryStorage()
})  


router.post("/", optionalAuthenticate, createLead)
router.get("/", optionalAuthenticate, getLeads)
router.get("/untagged", optionalAuthenticate, getUntaggedLeads)
router.get("/duplicates", optionalAuthenticate, getDuplicateLeads)
router.get("/trash", optionalAuthenticate, getTrashLeads)
router.get('/sample-excel', sampleExcel)
router.post('/import', optionalAuthenticate, upload.single("file"), importExcel)
router.patch("/bulk/trash", authenticate, bulkTrashLeads)
router.patch("/bulk/restore", authenticate, bulkRestoreLeads)
router.patch("/bulk/tag-source", optionalAuthenticate, bulkTagLeadSources)
router.delete("/bulk/permanent", authenticate, bulkPermanentlyDeleteLeads)
router.patch("/:id/tag-source", optionalAuthenticate, tagLeadSource)
router.get("/:id", optionalAuthenticate, getLeadById)
router.patch("/:id", optionalAuthenticate, updateLead)
router.patch("/:id/restore", optionalAuthenticate, restoreLead)
router.delete("/:id", optionalAuthenticate, deleteLead)
router.delete("/:id/permanent", authenticate, permanentlyDeleteLead)

module.exports = router
