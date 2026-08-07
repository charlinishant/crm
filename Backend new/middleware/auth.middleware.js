const jwt = require("jsonwebtoken")

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required" })
  }

  try {
    req.authUser = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}

const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return next()
  }

  try {
    req.authUser = jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    req.authUser = null
  }

  next()
}

module.exports = authenticate
module.exports.optionalAuthenticate = optionalAuthenticate
