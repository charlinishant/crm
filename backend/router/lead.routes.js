const {Router} = require("express")
const multer = require("multer")

const { optionalAuthenticate } = require("../middleware/auth.middleware")
const {createLead, getLeads, getTrashLeads, getLeadById, updateLead, deleteLead, restoreLead, permanentlyDeleteLead, importExcel, sampleExcel} = require("../controller/lead.controller")

const router = Router()

// router.use(authenticate)

const upload = multer({
    storage: multer.memoryStorage()
})  


router.post("/", optionalAuthenticate, createLead)
router.get("/", getLeads)
router.get("/trash", getTrashLeads)
router.get('/sample-excel', sampleExcel)
router.post('/import',upload.single("file"), importExcel)
router.get("/:id", getLeadById)
router.patch("/:id", updateLead)
router.patch("/:id/restore", restoreLead)
router.delete("/:id", deleteLead)
router.delete("/:id/permanent", permanentlyDeleteLead)

module.exports = router
