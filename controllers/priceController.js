const PriceModel = require('../models/priceModel');
const wsManager = require('../websocket/priceWebSocket');

class PriceController {
  
  // 1. WebSocket Status
  static async getWebSocketStatus(req, res) {
    try {
      res.json({
        success: true,
        status: 'active',
        connectedClients: wsManager.wss ? wsManager.wss.clients.size : 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 2. Get Single Live Price
  static async getLivePrice(req, res) {
    try {
      const { symbol } = req.params;
      const priceData = await PriceController.fetchFromMarketAPI(symbol);
      res.json({ success: true, symbol, ...priceData });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 3. Get Multiple Prices (Used by your React Frontend)
  static async getMultiplePrices(req, res) {
    try {
      const { symbols } = req.body; 
      if (!Array.isArray(symbols)) return res.status(400).json({ error: 'Symbols array required' });

      const prices = await Promise.all(symbols.map(async (symbol) => {
        const priceData = await PriceController.fetchFromMarketAPI(symbol);
        return {
          symbol,
          name: symbol,
          price: priceData.price,
          change: priceData.changePercent + "%",
          up: parseFloat(priceData.changePercent) >= 0,
          icon: `https://cryptologos.cc/logos/${symbol.toLowerCase()}-${symbol.toLowerCase()}-logo.png`
        };
      }));
      res.json(prices);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 4. Get Price Changes (Crucial to prevent your crash)
  static async getPriceChanges(req, res) {
    res.json({ success: true, message: "Endpoint active" });
  }

  // 5. Get Cached Price (Crucial to prevent your crash)
  static async getCachedPrice(req, res) {
    res.json({ success: true, message: "Endpoint active" });
  }

  // 6. Health Check
  static async getHealth(req, res) {
    res.json({ success: true, status: 'healthy' });
  }

  // Helper
  static async fetchFromMarketAPI(symbol) {
    // Mock data for testing
    return {
      price: (Math.random() * 0.5).toFixed(4),
      changePercent: (Math.random() * 10 - 5).toFixed(2)
    };
  }
}

module.exports = PriceController;