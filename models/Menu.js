const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  deliveryId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  discountPrice: {
    type: Number
  },
  description: {
    type: String,
  }
});

module.exports = mongoose.model("Menu", MenuSchema);
