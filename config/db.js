const mongoose = require("mongoose");
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    // .connect return promises
    console.log("Database connected successfully");
  } catch (err) {
    // err comes from mongoose as a reject
    console.error(err.message);
    console.error("Database failed to connect");
    process.exit(1);
    // Stop the Node.js(srever) application immediately if database connection fails.
  }
};
module.exports = connectDB;
