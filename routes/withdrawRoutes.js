const express = require("express");

const router = express.Router();

const {
  requestWithdraw,
  getWithdrawRequests,
  updateWithdrawStatus,
} = require("../controllers/withdrawController");

const { authMiddleware } = require("../middlewares/auth");

// USER
router.post("/request", authMiddleware, requestWithdraw);

// ADMIN
router.get("/admin/requests", authMiddleware, getWithdrawRequests);

router.put(
  "/admin/requests/:id",
  authMiddleware,
  updateWithdrawStatus
);

module.exports = router;