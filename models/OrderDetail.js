const mongoose = require('mongoose');

const orderDetailSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  orderUser: {
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
  orderTime: {
    type: Date,
    default: Date.now
  }
});

const OrderDetail = mongoose.model('OrderDetail', orderDetailSchema);

module.exports = OrderDetail;