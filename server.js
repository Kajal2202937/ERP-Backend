require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

const connectDB = require("./config/db");
const { initSocket } = require("./socket/ticketSocket");

const { notFound } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const productRoutes = require("./routes/productRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const orderRoutes = require("./routes/orderRoutes");
const productionRoutes = require("./routes/productionRoutes");
const reportRoutes = require("./routes/reportRoutes");
const insightRoutes = require("./routes/insightRoutes");
const aiRoutes = require("./routes/aiRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const ticketRoutes = require("./routes/ticketRoutes");

const app = express();

const PORT = process.env.PORT || 10000;

app.set("trust proxy", 1);

app.use(helmet());

app.use(compression());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },

    credentials: true,
  }),
);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 20,

  standardHeaders: true,

  legacyHeaders: false,

  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip);
  },

  message: {
    success: false,

    message: "Too many login attempts. Please try again later.",
  },
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 300,

  standardHeaders: true,

  legacyHeaders: false,

  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip);
  },

  message: {
    success: false,

    message: "Too many requests. Please try again later.",
  },
});

const ticketCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,

  max: 10,

  standardHeaders: true,

  legacyHeaders: false,

  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip);
  },

  message: {
    success: false,

    message: "Too many support tickets submitted. Please try again later.",
  },
});

const ticketReplyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 60,

  standardHeaders: true,

  legacyHeaders: false,

  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip);
  },

  message: {
    success: false,

    message: "Too many messages. Please slow down.",
  },
});

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,

    message: "ERP API Running 🚀",

    environment: process.env.NODE_ENV || "development",

    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,

    message: "Healthy",
  });
});

app.use("/api/tickets", ticketReplyLimiter, ticketRoutes);

app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/users", globalLimiter, userRoutes);

app.use("/api/inventory", globalLimiter, inventoryRoutes);

app.use("/api/products", globalLimiter, productRoutes);

app.use("/api/suppliers", globalLimiter, supplierRoutes);

app.use("/api/orders", globalLimiter, orderRoutes);

app.use("/api/production", globalLimiter, productionRoutes);

app.use("/api/reports", globalLimiter, reportRoutes);

app.use("/api/insights", globalLimiter, insightRoutes);

app.use("/api/ai", globalLimiter, aiRoutes);

app.use("/api/pdf", globalLimiter, pdfRoutes);

app.use(notFound);

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);

    initSocket(server);

    server.listen(PORT, () => {
      console.log(
        `🚀 Server running in ${
          process.env.NODE_ENV || "development"
        } mode on port ${PORT}`,
      );
    });

    const shutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      server.close(() => {
        console.log("✅ HTTP server closed.");

        process.exit(0);
      });

      setTimeout(() => {
        console.error("⚠️ Force shutdown after timeout.");

        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));

    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);

    process.exit(1);
  }
};

startServer();
