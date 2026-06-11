const { createClient } = require("redis");
const AppError = require("../utils/AppError");
let redisClient = null;
let isRedisConnected = false;

const connectRedis = async () => {
  if (!process.env.REDIS_URL) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "⚠️  [Redis] REDIS_URL not set in production. " +
          "Rate limiters will use in-memory store — NOT SAFE for multi-instance deployments. " +
          "Set REDIS_URL to a Redis instance to fix this.",
      );
    } else {
      console.log(
        "ℹ️  [Redis] REDIS_URL not set — using in-memory rate limit store (dev mode)",
      );
    }
    return null;
  }

  try {
    const client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error("❌ [Redis] Too many reconnect attempts. Giving up.");
            return new AppError("Redis reconnect limit reached");
          }
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 5000,
      },
    });

    client.on("connect", () => console.log("✅ Redis connected"));
    client.on("ready", () => {
      isRedisConnected = true;
    });
    client.on("error", (err) => {
      console.error("❌ [Redis] Client error:", err.message);
      isRedisConnected = false;
    });
    client.on("reconnecting", () => console.warn("🔄 [Redis] Reconnecting..."));
    client.on("end", () => {
      console.warn("⚠️  [Redis] Connection closed");
      isRedisConnected = false;
    });

    await client.connect();
    redisClient = client;
    return client;
  } catch (err) {
    console.error("❌ [Redis] Failed to connect:", err.message);
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "⚠️  [Redis] Falling back to in-memory rate limit store in production.",
      );
    }
    return null;
  }
};

const getRedisClient = () => redisClient;
const isRedisReady = () => isRedisConnected;

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit().catch(() => {});
    redisClient = null;
    isRedisConnected = false;
    console.log("✅ Redis disconnected");
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisReady,
  disconnectRedis,
};
