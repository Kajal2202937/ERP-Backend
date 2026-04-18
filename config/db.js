const mongoose = require("mongoose");
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log("Database connected successfully");
  } catch (err) {
    
    console.error(err.message);
    console.error("Database failed to connect");
    process.exit(1);
    
  }
};
module.exports = connectDB;
