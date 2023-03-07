const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true
  },
  deliveryId: {
    type: String,
    required: true
  },
  shopId: {
    type: String,
    required: true
  },
  shopName: {
    type: String,
    required: true
  },
  description: String,
  capacity: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;