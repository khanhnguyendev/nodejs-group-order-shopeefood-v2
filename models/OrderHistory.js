const mongoose = require("mongoose");

const OrderHistorySchema = new mongoose.Schema({
  roomName: String,
  shopName: String,
  userName: String,
  title: String,
  price: Number,
  qty: Number,
  note: String,
  orderTime: Date,
});

const OrderHistory = mongoose.model("OrderHistory", OrderHistorySchema);

module.exports = OrderHistory;
