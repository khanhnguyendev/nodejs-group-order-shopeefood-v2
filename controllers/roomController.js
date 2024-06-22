const RoomSchema = require("../models/Room");

exports.findRoomByRoomName = async (req, res) => {
  try {
    let roomName = req.query.roomName;
    const roomInfo = await RoomSchema.find({ roomName }).select(["-__v"]);

    return res.json({
      result: 200,
      reply: roomInfo,
    });
  } catch (error) {
    console.log("Error with fetching thoughts: ", error);
    return res.json({
      success: false,
      message:
        "Error with fetching thoughts. See server console for more info.",
    });
  }
};

exports.getAllHistoryRoomName = async (req, res) => {
  try {
    const historyRooms = await RoomSchema.find({}).select(["-__v"]);

    return res.json({
      result: 200,
      reply: historyRooms,
    });
  } catch (error) {
    console.log("Error with fetching thoughts: ", error);
    return res.json({
      success: false,
      message:
        "Error with fetching thoughts. See server console for more info.",
    });
  }
};
