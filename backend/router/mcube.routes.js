const { Router} = require("express")

const { getRecords} = require("../controller/mcube.controller")


const router = Router()

router.get("/records", getRecords)

export default router