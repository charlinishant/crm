const {Router} = require("express")
const multer = require("multer")
const fs = require("fs")
const path = require("path")
const {createFloor, getFloor, updateFloor, deleteFloor, listFloor} = require("../controller/floorplan.controller")
    
const router = Router()
const uploadRoot = path.join(__dirname, "..", "uploads", "floor-plans")
const safeName = (value) => String(value || "floor-plan")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            fs.mkdirSync(uploadRoot, { recursive: true })
            cb(null, uploadRoot)
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname)
            const base = path.basename(file.originalname, ext)
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName(base)}${ext}`)
        },
    }),
    limits: {
        fileSize: Number(process.env.FLOOR_PLAN_FILE_LIMIT_BYTES) || 25 * 1024 * 1024,
        files: Number(process.env.FLOOR_PLAN_FILE_LIMIT_COUNT) || 10,
    },
})

const parseExistingImages = (value) => {
    if (!value) return []
    if (Array.isArray(value)) return value
    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

const attachUploadedFloorPlans = (req, res, next) => {
    const existingImages = parseExistingImages(req.body.floorPlanImages)

    if (Array.isArray(req.files) && req.files.length) {
        req.body.floorPlanImages = [
            ...existingImages,
            ...req.files.map((file) => ({
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            path: `/uploads/floor-plans/${file.filename}`,
        })),
        ]
    } else {
        req.body.floorPlanImages = existingImages
    }

    next()
}

const handleUploadError = (error, req, res, next) => {
    if (!error) return next()

    if (error instanceof multer.MulterError) {
        return res.status(413).json({
            message: error.code === "LIMIT_FILE_SIZE"
                ? "Floor plan upload is too large. Please choose a smaller image/PDF."
                : "Too many floor plan files selected.",
        })
    }

    return next(error)
}

const floorPlanUpload = [
    upload.any(),
    handleUploadError,
    attachUploadedFloorPlans,
]

router.post("/", floorPlanUpload, createFloor)
router.get("/list", listFloor)
router.get("/", getFloor)
router.get("/:id", getFloor)
router.patch("/:id", floorPlanUpload, updateFloor)
router.delete("/:id", deleteFloor)

module.exports = router
