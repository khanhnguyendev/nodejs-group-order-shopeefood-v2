const mongoose = require("mongoose");

const OrderHistorySchema = new mongoose.Schema({
  roomName: String,
  shopName: String,
  orderUser: String,
  foodTitle: String,
  foodPrice: Number,
  foodQty: Number,
  foodNote: String,
  ipUser: String,
  roomCreateDate: Date,
  createdTime: Date,
  updatedTime: Date,

  // roomName: {
  //   type: String,
  //   required: true
  // },
  // shopName: {
  //   type: String,
  //   required: true
  // },
  // orderUser: {
  //   type: String,
  //   required: true
  // },
  // food: {
  //   foodTitle: {
  //     type: String,
  //     required: true
  //   },
  //   foodPrice: {
  //     type: Number,
  //     required: true
  //   },
  //   foodQty: {
  //     type: Number,
  //     default: 1,
  //     required: true
  //   },
  //   foodNote: {
  //     type: String
  //   }
  // },
  // ipUser: {
  //   type: String,
  //   required: true
  // },
  // createdTime: {
  //   type: Date,
  //   default: Date.now,
  //   required: true
  // },
  // updatedTime: {
  //   type: Date,
  //   default: Date.now,
  //   required: true
  // }
});

const OrderHistory = mongoose.model("OrderHistory", OrderHistorySchema);

module.exports = OrderHistory;
