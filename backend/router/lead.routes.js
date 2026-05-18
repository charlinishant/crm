const {Router} = require("express")
const multer = require("multer")

<<<<<<< HEAD
const {createLead, getLeads, getTrashLeads, getLeadById, updateLead, deleteLead, restoreLead, permanentlyDeleteLead, importExcel, sampleExcel} = require("../controller/lead.controller")
=======
const {createLead, getLeads, getLeadById, updateLead, deleteLead, importExcel, sampleExcel} = require("../controller/lead.controller")
const authenticate = require("../middleware/auth.middleware")
>>>>>>> 4796729960b6890a0268ece2cec7d74de9a9f0bb

const router = Router()

router.use(authenticate)

const upload = multer({
    storage: multer.memoryStorage()
})  


router.post("/",  createLead)
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
