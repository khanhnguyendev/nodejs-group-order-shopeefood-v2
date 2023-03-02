const mongoose = require("mongoose");

const OrderHistorySchema = new mongoose.Schema({
  roomName: String,
  shopName: String,
  orderUser: String,
  foodTitle: String,
  foodPrice: Number,
  foodQty: Number,
  foodNote: String,
  createdTime: Date,
  updatedTime: Date,
});

const OrderHistory = mongoose.model("OrderHistory", OrderHistorySchema);

module.exports = OrderHistory;
