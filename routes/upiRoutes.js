const express = require("express");
const router = express.Router();

const {
  getUpiId,
  updateUpiId,
} = require("../controllers/upiController");

const { authMiddleware } = require("../middlewares/auth");

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Admin access only",
  });
};

router.get("/", getUpiId);

router.put("/", authMiddleware, admin, updateUpiId);

module.exports = router;