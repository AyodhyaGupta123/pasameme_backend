const express = require('express');
const PriceController = require('../controllers/priceController');
const router = express.Router();

router.get('/ws/status', PriceController.getWebSocketStatus);
router.get('/live/:symbol', PriceController.getLivePrice);
router.post('/live/batch', PriceController.getMultiplePrices);
router.get('/changes/:symbol', PriceController.getPriceChanges); 
router.get('/cached/:symbol', PriceController.getCachedPrice);
router.get('/health', PriceController.getHealth);

module.exports = router;