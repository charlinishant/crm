const { Router } = require("express");
const authenticate = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/auth.middleware");
const {
  register,
  login,
  logout,
  heartbeat,
  sessionCloseBeacon,
  forceLogout,
} = require("../controllers/authentication.controller");

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.post("/heartbeat", authenticate, heartbeat);
router.post("/session-close", sessionCloseBeacon);
router.post("/force-logout/:userId", requireAdmin, forceLogout);

module.exports = router;