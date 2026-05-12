const Order = require('../models/Order');

class OrderController {
  static async createOrder(req, res) {
    try {
      const { userId, symbol, targetPrice, side, scheduleMinutes } = req.body;
      if (!userId || !symbol || !targetPrice || !side) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      await Order.create({ userId, symbol, targetPrice, side, scheduleMinutes });
      res.json({ success: true, message: 'Order created' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getPendingOrders(req, res) {
    try {
      const orders = await Order.getPending();
      res.json({ success: true, orders });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateOrderStatus(req, res) {
    try {
      const { orderId, status } = req.body;
      await Order.updateStatus(orderId, status);
      res.json({ success: true, message: 'Order status updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = OrderController;
