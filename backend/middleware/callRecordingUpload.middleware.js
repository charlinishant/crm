const fs = require("fs")
const path = require("path")
const multer = require("multer")

const uploadRoot = path.join(__dirname, "..", "uploads", "call-recordings")

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadRoot, { recursive:true })
    cb(null, uploadRoot)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".mp3"
    const safeExt = /^\.[a-z0-9]+$/i.test(ext) ? ext : ".mp3"
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`)
  },
})

const upload = multer({
  storage,
  limits:{ fileSize:100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const type = String(file.mimetype || "").toLowerCase()
    if (!type || type.startsWith("audio/") || type === "application/octet-stream") return cb(null, true)
    cb(new Error("Only audio recordings can be uploaded"))
  },
})

const callRecordingUpload = (req, res, next) => {
  upload.any()(req, res, (error) => {
    if (error) {
      return res.status(error instanceof multer.MulterError ? 413 : 400).json({
        message:error.message || "Unable to upload call recording",
      })
    }

    const file = Array.isArray(req.files)
      ? req.files.find((item) => ["recording", "file", "audio", "recordingFile"].includes(item.fieldname)) || req.files[0]
      : null
    if (file) req.body.recordingUrl = `/uploads/call-recordings/${file.filename}`
    next()
  })
}

module.exports = callRecordingUpload
