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

module.exports = authenticate
