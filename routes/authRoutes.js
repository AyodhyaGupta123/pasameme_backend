const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getProfile,
  updateBalance,
  depositByCard,
} = require("../controllers/authController");

const { authMiddleware } = require("../middlewares/auth");
const {
  validateRegister,
  validateLogin,
  validateBalance,
  validateCardDeposit,
} = require("../middlewares/validation");

// Public Routes
router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);

// Protected Routes
router.get("/profile", authMiddleware, getProfile);
router.patch("/balance", authMiddleware, validateBalance, updateBalance);
router.post(
  "/deposit-card",
  authMiddleware,
  validateCardDeposit,
  depositByCard,
);

module.exports = router;
