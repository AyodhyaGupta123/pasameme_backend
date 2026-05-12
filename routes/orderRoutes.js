const express = require('express');
const OrderController = require('../controllers/orderController');
const router = express.Router();

router.post('/create', OrderController.createOrder);
router.get('/pending', OrderController.getPendingOrders);
router.post('/update', OrderController.updateOrderStatus);

module.exports = router;
