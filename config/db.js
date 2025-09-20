const mongoose = require("mongoose");

const dburl = "mongodb+srv://apurva:apurva123@cluster0.8v98dye.mongodb.net/ordersDB?retryWrites=true&w=majority&appName=Cluster0";
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
