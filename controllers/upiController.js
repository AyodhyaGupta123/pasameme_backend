const PaymentSettings = require("../models/PaymentSettings");

const getUpiId = async (req, res) => {
  try {
    let settings = await PaymentSettings.findOne();

    if (!settings) {
      settings = await PaymentSettings.create({
        upiId: "8175847774@okbizaxis",
      });
    }

    res.json({
      success: true,
      upiId: settings.upiId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch UPI ID",
    });
  }
};

const updateUpiId = async (req, res) => {
  try {
    const { upiId } = req.body;

    if (!upiId || !upiId.trim()) {
      return res.status(400).json({
        success: false,
        message: "UPI ID is required",
      });
    }

    let settings = await PaymentSettings.findOne();

    if (!settings) {
      settings = await PaymentSettings.create({
        upiId: upiId.trim(),
      });
    } else {
      settings.upiId = upiId.trim();
      await settings.save();
    }

    res.json({
      success: true,
      message: "UPI ID updated successfully",
      upiId: settings.upiId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update UPI ID",
    });
  }
};

module.exports = {
  getUpiId,
  updateUpiId,
};