const Order = require('../models/Order');
const PriceModel = require('../models/priceModel');

async function checkAndExecuteOrders() {
  const orders = await Order.getPending();
  for (const order of orders) {
    // Fetch current price for the symbol
    const priceData = await PriceModel.getLivePrice(order.symbol);
    const currentPrice = parseFloat(priceData?.current_price);
    const targetPrice = parseFloat(order.target_price);
    const now = new Date();
    const createdAt = new Date(order.created_at);
    const scheduledTime = order.schedule_minutes ? order.schedule_minutes * 60 * 1000 : 0;
    const timeHit = scheduledTime > 0 && now - createdAt >= scheduledTime;
    let shouldExecute = false;
    if (order.side === 'buy' && currentPrice >= targetPrice) shouldExecute = true;
    if (order.side === 'sell' && currentPrice <= targetPrice) shouldExecute = true;
    if (timeHit) shouldExecute = true;
    if (shouldExecute) {
      await Order.updateStatus(order.id, 'executed');
      // Add actual execution logic here (wallet update, notification, etc.)
    }
  }
}

function startScheduler() {
  setInterval(checkAndExecuteOrders, 5000); // Check every 5 seconds
}

module.exports = { startScheduler };
