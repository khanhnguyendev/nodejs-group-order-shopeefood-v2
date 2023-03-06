const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  deliveryId: {
    type: String,
    required: true,
  },
  orderUser: {
    type: String,
    required: true
  },
  ipUser: {
    type: String,
    required: true
  },
  foodTitle: {
    type: String,
    required: true
  },
  foodPrice: {
    type: Number,
    required: true
  },
  foodQty: {
    type: Number,
    required: true
  },
  foodNote: String,
  createdTime: {
    type: Date,
    default: Date.now
  },
  updatedTime: {
    type: Date,
    default: Date.now
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;