const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getProfile,
  updateBalance,
  depositByCard,
  requestDeposit,
} = require("../controllers/authController");
const { requestWithdraw } = require("../controllers/withdrawController");

const { authMiddleware } = require("../middlewares/auth");
const {
  validateRegister,
  validateLogin,
  validateBalance,
  validateCardDeposit,
  validateDepositRequest,
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
router.post("/deposit-request", authMiddleware, validateDepositRequest, requestDeposit);
router.post("/withdraw", authMiddleware, requestWithdraw);

module.exports = router;
