const mongoose = require('mongoose');

async function connectDB() {
  try {
    console.log("process.env.DB_URI", process.env.DB_URI);

    await mongoose.connect(process.env.DB_URI);

    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

module.exports = connectDB;
