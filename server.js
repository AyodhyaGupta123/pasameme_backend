const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();
app.set("trust proxy", 1);

// ================= RATE LIMIT =================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});

// ================= SECURITY =================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use("/api", apiLimiter);

// ================= CORS (FIXED) =================
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman, mobile apps, SSR
      if (!origin) return callback(null, true);

      const allowed =
        origin.includes("localhost") ||
        origin.includes("onrender.com") ||
        origin.includes("pasameme.in");

      if (allowed) return callback(null, true);

      console.log("❌ Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Preflight fix
app.options("*", cors());

// ================= BODY PARSER =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= DEBUG (remove later) =================
app.use((req, res, next) => {
  console.log("🌍 Origin:", req.headers.origin);
  console.log("🔐 Auth Header:", req.headers.authorization);
  next();
});

// ================= DB & ROUTES =================
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const headerRoutes = require("./routes/headerRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const priceRoutes = require("./routes/priceRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const cardRoutes = require("./routes/cardRoutes");
const paymentOtpRoutes = require("./routes/paymentOtpRoutes");
const orderRoutes = require("./routes/orderRoutes");
const withdrawRoutes = require("./routes/withdrawRoutes");
const otpRoutes = require("./routes/otpRoutes");
const adminRoutes = require("./routes/adminRoutes");
const priceWS = require("./websocket/priceWebSocket");

// Health check
app.get("/", (req, res) => {
  res.status(200).send("🚀 PasaMeme API Live");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/header", headerRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/prices", priceRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/payment-otp", paymentOtpRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/withdraw", withdrawRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/admin", adminRoutes);

// ================= SERVER =================
const server = http.createServer(app);

// WebSocket init
if (priceWS?.init) {
  priceWS.init(server);
}

// Start order scheduler
const { startScheduler } = require("./services/orderScheduler");
startScheduler();

// Start daily notification scheduler
require("./services/dailyNotificationScheduler");

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ Server start failed:", err);
  }
};

startServer();
