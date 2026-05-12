const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
// TODO: Add admin authentication middleware

// Approve withdrawal
router.post("/withdraw/approve", adminController.approveWithdraw);
// Reject withdrawal
router.post("/withdraw/reject", adminController.rejectWithdraw);

module.exports = router;
