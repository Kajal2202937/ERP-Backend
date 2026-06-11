require("dotenv").config();

const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "ALLOWED_ORIGINS"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(
    `❌ Missing required environment variables: ${missingEnv.join(", ")}`,
  );
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET must be at least 32 characters for security");
  process.exit(1);
}

if (!process.env.NODE_ENV) {
  console.error(
    "❌ NODE_ENV is not set. Set it to 'production' or 'development'.",
  );
  process.exit(1);
}
const VALID_ENVS = ["production", "development", "test"];
if (!VALID_ENVS.includes(process.env.NODE_ENV)) {
  console.error(
    `❌ NODE_ENV="${process.env.NODE_ENV}" is not valid. Must be one of: ${VALID_ENVS.join(", ")}`,
  );
  process.exit(1);
}

const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { doubleCsrf } = require("csrf-csrf");
const { requestIdMiddleware } = require("./middleware/requestId");
const AppError = require("./utils/AppError");
const connectDB = require("./config/db");
const {
  connectRedis,
  getRedisClient,
  disconnectRedis,
} = require("./config/redis");
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
const auditRoutes = require("./routes/auditRoutes");

const app = express();
const PORT = process.env.PORT || 10000;
const IS_PROD = process.env.NODE_ENV === "production";

const log = {
  info: (msg, meta = {}) =>
    console.log(
      JSON.stringify({
        level: "info",
        msg,
        ...meta,
        ts: new Date().toISOString(),
      }),
    ),
  warn: (msg, meta = {}) =>
    console.warn(
      JSON.stringify({
        level: "warn",
        msg,
        ...meta,
        ts: new Date().toISOString(),
      }),
    ),
  error: (msg, meta = {}) =>
    console.error(
      JSON.stringify({
        level: "error",
        msg,
        ...meta,
        ts: new Date().toISOString(),
      }),
    ),
};

process.on("uncaughtException", (err) => {
  log.error("uncaughtException", { error: err.message, stack: err.stack });
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  log.error("unhandledRejection", {
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        ...(IS_PROD ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.disable("x-powered-by");
app.use(compression());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    log.warn("CORS blocked", { origin });
    return callback(new AppError(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "x-csrf-token",
    "x-request-id",
  ],
};
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

if (process.env.NODE_ENV !== "test") {
  if (IS_PROD) {
    morgan.token("reqid", (req) => req.headers["x-request-id"] || "-");
    app.use(
      morgan((tokens, req, res) =>
        JSON.stringify({
          level: "info",
          msg: "http",
          method: tokens.method(req, res),
          url: tokens.url(req, res),
          status: Number(tokens.status(req, res)),
          ms: Number(tokens["response-time"](req, res)),
          reqid: tokens.reqid(req, res),
          ts: new Date().toISOString(),
        }),
      ),
    );
  } else {
    app.use(morgan("dev"));
  }
}

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(
  mongoSanitize({
    replaceWith: "_",
    onSanitize: ({ req, key }) => {
      log.warn("mongo-sanitize", { key, path: req.path });
    },
  }),
);

if (!process.env.CSRF_SECRET || process.env.CSRF_SECRET.length < 32) {
  log.error("CSRF_SECRET missing or too short — add it to .env (min 32 chars)");
  process.exit(1);
}

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  getSessionIdentifier: (req) => req.ip ?? "anon",
  cookieName: IS_PROD ? "__Host-csrf" : "csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    secure: IS_PROD,
    path: "/",
  },
  getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"],
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  ignoredPathPrefixes: ["/socket.io"],
});

const makeLimiter = (options) => {
  const redisClient = getRedisClient();
  const store = redisClient
    ? new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: `rl:${options.keyPrefix || "global"}:`,
      })
    : undefined;

  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req.ip),
    store,
    message: options.message,
  });
};

let authLimiter;
let globalLimiter;
let ticketReplyLimiter;

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
    redis: !!getRedisClient(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    authLimiter = makeLimiter({
      keyPrefix: "auth",
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: {
        success: false,
        message: "Too many login attempts. Please try again later.",
      },
    });

    globalLimiter = makeLimiter({
      keyPrefix: "global",
      windowMs: 15 * 60 * 1000,
      max: 300,
      message: {
        success: false,
        message: "Too many requests. Please try again later.",
      },
    });

    ticketReplyLimiter = makeLimiter({
      keyPrefix: "ticket",
      windowMs: 15 * 60 * 1000,
      max: 60,
      message: {
        success: false,
        message: "Too many messages. Please slow down.",
      },
    });

    app.use(doubleCsrfProtection);

    app.get("/api/csrf-token", (req, res) => {
      const token = generateCsrfToken(req, res);
      res.status(200).json({ csrfToken: token });
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
    app.use("/api/audit", globalLimiter, auditRoutes);

    app.use(notFound);
    app.use(errorHandler);

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      log.info("server started", {
        port: PORT,
        env: process.env.NODE_ENV || "development",
        origins: allowedOrigins,
        rateLimit: getRedisClient() ? "redis" : "memory",
        csrf: "enabled (double-submit cookie)",
      });
    });

    const shutdown = async (signal) => {
      log.info("shutdown initiated", { signal });
      server.close(async () => {
        log.info("http server closed");
        await disconnectRedis();
        process.exit(0);
      });
      setTimeout(() => {
        log.error("force shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    log.error("server failed to start", { error: err.message });
    process.exit(1);
  }
};

startServer();
