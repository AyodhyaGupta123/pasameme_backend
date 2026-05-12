const db = require('../config/db');

class PriceModel {
  
  // Update live price in database
  static async updateLivePrice(symbol, price, timestamp) {
    try {
      const query = `
        UPDATE prices 
        SET current_price = ?, 
            last_updated = ?,
            updated_at = ?
        WHERE symbol = ?
      `;
      return db.run(query, [price, timestamp, new Date(), symbol]);
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  }

  // Get current live price
  static async getLivePrice(symbol) {
    try {
      const query = `
        SELECT symbol, current_price, last_updated, 
               previous_price, change_percent
        FROM prices 
        WHERE symbol = ?
      `;
      return db.get(query, [symbol]);
    } catch (error) {
      console.error('Database get error:', error);
      throw error;
    }
  }

  // Get all live prices
  static async getAllLivePrices() {
    try {
      const query = `
        SELECT symbol, current_price, last_updated, 
               previous_price, change_percent, volume
        FROM prices 
        ORDER BY symbol ASC
      `;
      return db.all(query);
    } catch (error) {
      console.error('Database all prices error:', error);
      throw error;
    }
  }

  // Get price changes since specific timestamp
  static async getPriceChangesSince(symbol, fromTimestamp) {
    try {
      const query = `
        SELECT symbol, current_price, previous_price,
               (current_price - previous_price) as price_change,
               ((current_price - previous_price) / previous_price * 100) as change_percent,
               last_updated
        FROM prices 
        WHERE symbol = ? AND last_updated > ?
        ORDER BY last_updated DESC
      `;
      return db.all(query, [symbol, new Date(fromTimestamp)]);
    } catch (error) {
      console.error('Database changes error:', error);
      throw error;
    }
  }

  // Bulk update prices
  static async bulkUpdatePrices(priceUpdates) {
    try {
      const query = `
        UPDATE prices 
        SET current_price = ?, 
            last_updated = ?
        WHERE symbol = ?
      `;
      
      const stmt = db.prepare(query);
      
      priceUpdates.forEach(update => {
        stmt.run([update.price, new Date(), update.symbol]);
      });
      
      stmt.finalize();
      return { success: true, updated: priceUpdates.length };
    } catch (error) {
      console.error('Bulk update error:', error);
      throw error;
    }
  }

  // Get top gainers
  static async getTopGainers(limit = 10) {
    try {
      const query = `
        SELECT symbol, current_price, change_percent, volume
        FROM prices 
        WHERE change_percent > 0
        ORDER BY change_percent DESC
        LIMIT ?
      `;
      return db.all(query, [limit]);
    } catch (error) {
      console.error('Top gainers error:', error);
      throw error;
    }
  }

  // Get top losers
  static async getTopLosers(limit = 10) {
    try {
      const query = `
        SELECT symbol, current_price, change_percent, volume
        FROM prices 
        WHERE change_percent < 0
        ORDER BY change_percent ASC
        LIMIT ?
      `;
      return db.all(query, [limit]);
    } catch (error) {
      console.error('Top losers error:', error);
      throw error;
    }
  }

  // Record price history for analysis
  static async recordPriceHistory(symbol, price, timestamp) {
    try {
      const query = `
        INSERT INTO price_history (symbol, price, timestamp)
        VALUES (?, ?, ?)
      `;
      return db.run(query, [symbol, price, timestamp]);
    } catch (error) {
      console.error('Price history error:', error);
      throw error;
    }
  }

  // Get price history for chart
  static async getPriceHistory(symbol, minutes = 60) {
    try {
      const query = `
        SELECT price, timestamp
        FROM price_history 
        WHERE symbol = ? 
        AND timestamp > datetime('now', '-' || ? || ' minutes')
        ORDER BY timestamp ASC
      `;
      return db.all(query, [symbol, minutes]);
    } catch (error) {
      console.error('Price history fetch error:', error);
      throw error;
    }
  }

  // Check if symbol exists
  static async symbolExists(symbol) {
    try {
      const query = `SELECT COUNT(*) as count FROM prices WHERE symbol = ?`;
      const result = db.get(query, [symbol]);
      return result.count > 0;
    } catch (error) {
      console.error('Symbol check error:', error);
      throw error;
    }
  }
}

module.exports = PriceModel;