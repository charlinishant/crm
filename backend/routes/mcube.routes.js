const { Router } = require("express")
const { getRecords } = require("../controllers/mcube.controller")

const router = Router()

router.get("/records", getRecords)

module.exports = router