const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Extract token from header
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication token not found. Please log in first.",
      });
    }

    // 2. Parse token
    const token = authHeader.replace("Bearer ", "");

    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const idToFind = decoded.userId || decoded.id || decoded.sub;

    if (!idToFind) {
      return res.status(401).json({
        success: false,
        error: "Invalid token structure. No user ID found in payload.",
      });
    }

    // 4. Find user in database (excluding password)
    const user = await User.findById(idToFind).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found. Account may not exist or token is invalid.",
      });
    }

    req.user = user;
    req.userId = user._id;
    req.token = token;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token. Please log in again.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Your session has expired. Please log in again.",
      });
    }

    console.error("Auth Middleware Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error: Authentication failed",
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const idToFind = decoded.userId || decoded.id;
    const user = await User.findById(idToFind).select("-password");

    if (user) {
      req.user = user;
      req.userId = user._id;
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuth,
};
