const {Router} = require("express")
const multer = require("multer")

const {createLead, getLeads, getLeadById, updateLead, deleteLead, importExcel, sampleExcel} = require("../controller/lead.controller")
const authenticate = require("../middleware/auth.middleware")

const router = Router()

router.use(authenticate)

const upload = multer({
    storage: multer.memoryStorage()
})  


router.post("/",  createLead)
router.get("/", getLeads)
router.get('/sample-excel', sampleExcel)
router.post('/import',upload.single("file"), importExcel)
router.get("/:id", getLeadById)
router.patch("/:id", updateLead)
router.delete("/:id", deleteLead)

module.exports = router