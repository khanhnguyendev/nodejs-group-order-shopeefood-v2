const OrderSchema = require("../models/Order");

exports.addOrder = async (req, res) => {
  try {
    const order = await OrderSchema.create({
      name: req.body.name,
      description: req.body.description,
    });

    return res.json({
      success: 200,
      message: "Order successfully added.",
    });
  } catch (error) {
    console.log("Error with adding thought: ", error);
    return res.json({
      success: false,
      message: "Error with adding thought. See server console for more info.",
    });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const roomId = req.query.roomId;
    const deliveryId = req.query.requestId;

    const orders = await OrderSchema.find({ roomId, deliveryId }).select([
      "-__v",
    ]);

    const convertedOrders = orders.map((order) => {
      const convertedTime = order.createdTime.toLocaleString("en-US", {
        timeZone: "Asia/Bangkok",
      });
      return { ...order, createdTime: convertedTime };
    });

    return res.json({
      result: 200,
      reply: convertedOrders,
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
