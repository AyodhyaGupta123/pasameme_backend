const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
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

router.post(
  "/notifications",
  authMiddleware,
  admin,
  adminController.createNotification
);

router.get(
  "/notifications",
  authMiddleware,
  admin,
  adminController.getNotifications
);

router.get("/dashboard", authMiddleware, admin, adminController.getDashboard);
router.get("/latest-requests", authMiddleware, admin, adminController.getLatestRequests);
router.get("/deposit-requests", authMiddleware, admin, adminController.getDepositRequests);
router.get("/withdraw-requests", authMiddleware, admin, adminController.getWithdrawRequests);
router.get("/users", authMiddleware, admin, adminController.getUsers);
router.put("/users/:userId/wallet", authMiddleware, admin, adminController.updateUserWallet);

router.post("/deposit/approve", authMiddleware, admin, adminController.approveDeposit);
router.post("/deposit/reject", authMiddleware, admin, adminController.rejectDeposit);
router.post("/withdraw/approve", authMiddleware, admin, adminController.approveWithdraw);
router.post("/withdraw/reject", authMiddleware, admin, adminController.rejectWithdraw);

module.exports = router;