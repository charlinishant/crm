const { Router } = require("express");
const authenticate = require("../middleware/auth.middleware");
const {
  createLeadActivity,
  getLeadActivities,
} = require("../controllers/leadActivity.controller");

const router = Router();

router.get("/", authenticate, getLeadActivities);
router.post("/", authenticate, createLeadActivity);

module.exports = router;
