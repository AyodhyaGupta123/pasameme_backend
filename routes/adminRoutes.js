const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
// TODO: Add admin authentication middleware

router.get("/dashboard", adminController.getDashboard);
router.get("/latest-requests", adminController.getLatestRequests);
router.get("/deposit-requests", adminController.getDepositRequests);
router.get("/withdraw-requests", adminController.getWithdrawRequests);
router.get("/users", adminController.getUsers);
router.put("/users/:userId/wallet", adminController.updateUserWallet);

router.post("/deposit/approve", adminController.approveDeposit);
router.post("/deposit/reject", adminController.rejectDeposit);
router.post("/withdraw/approve", adminController.approveWithdraw);
router.post("/withdraw/reject", adminController.rejectWithdraw);

module.exports = router;
