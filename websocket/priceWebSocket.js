// websocket/priceWebSocket.js
const WebSocket = require("ws");
const PriceModel = require("../models/priceModel"); // adjust path if needed

const clients = new Map(); // can be kept globally or inside the class

class PriceWebSocketManager {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.priceUpdateInterval = null;

    this.initializeWebSocket();
  }

  initializeWebSocket() {
    this.wss.on("connection", (ws, req) => {
      const clientId = Date.now().toString();
      const subscribedSymbols = new Set();

      clients.set(clientId, {
        ws,
        symbols: subscribedSymbols,
        connected: true,
      });

      console.log(`Client ${clientId} connected. Total: ${clients.size}`);

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data);

          if (message.type === "SUBSCRIBE") {
            subscribedSymbols.add(message.symbol);
            ws.send(
              JSON.stringify({
                type: "SUBSCRIBED",
                symbol: message.symbol,
                message: `Subscribed to ${message.symbol}`,
              }),
            );
          } else if (message.type === "UNSUBSCRIBE") {
            subscribedSymbols.delete(message.symbol);
            ws.send(
              JSON.stringify({
                type: "UNSUBSCRIBED",
                symbol: message.symbol,
              }),
            );
          }
        } catch (err) {
          console.error("Invalid message:", err);
        }
      });

      ws.on("close", () => {
        clients.delete(clientId);
        console.log(`Client ${clientId} disconnected. Total: ${clients.size}`);
      });

      ws.on("error", (err) => console.error("WS error:", err));
    });
  }

  async broadcastLivePrice(symbol, priceData) {
    clients.forEach((client) => {
      if (client.connected && client.symbols.has(symbol)) {
        client.ws.send(
          JSON.stringify({
            type: "PRICE_UPDATE",
            symbol,
            price: priceData.price,
            change: priceData.change,
            changePercent: priceData.changePercent,
            timestamp: new Date().toISOString(),
            volume: priceData.volume || 0,
          }),
        );
      }
    });
  }

  // other methods can remain the same: startPriceUpdates, fetchLivePrice, etc.
  // ...

  getClientsCount() {
    return clients.size;
  }
}

module.exports = PriceWebSocketManager;
