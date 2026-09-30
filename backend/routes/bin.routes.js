const express = require("express")
const router = express.Router()
const { getBinItems, restoreBinItem, permanentDeleteBinItem, emptyBin } = require("../controllers/bin.controller")
const { optionalAuthenticate, authenticate } = require("../middleware/auth.middleware")

router.get("/", optionalAuthenticate, getBinItems)
router.get("/items", optionalAuthenticate, getBinItems)
router.post("/restore", authenticate, restoreBinItem)
router.post("/permanent-delete", authenticate, permanentDeleteBinItem)
router.post("/empty", authenticate, emptyBin)

module.exports = router
