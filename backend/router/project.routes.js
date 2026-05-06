const {Router} = require("express")
const {createProject, getProject, getProjectById, updateProject, deleteProject,   listProject} = require("../controller/project.controller")

const router = Router()

router.post("/", createProject)
router.get("/list", listProject)
router.get("/", getProject)
router.get("/:id", getProjectById)
router.patch("/:id", updateProject)
router.delete("/:id", deleteProject)

module.exports = router
