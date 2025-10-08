const mongoose = require("mongoose");

const dburl = "mongodb+srv://buddhikaeranga54:9563@cluster1.cmszlan.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1";
// 👆 I added `ordersDB` (you can change this name if you want)

mongoose.set("strictQuery", true);

const connection = async () => {
  try {
    await mongoose.connect(dburl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected~");
  } catch (e) {
    console.error("❌ DB Connection Error:", e.message);
    process.exit(1);
  }
};

module.exports = connection;
