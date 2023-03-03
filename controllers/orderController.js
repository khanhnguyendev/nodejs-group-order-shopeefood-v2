const OrderHistory = require("../models/OrderHistory");

const addOrder = async (req, res) => {
  try {
    const order = await OrderHistory.create({
      name: req.body.name,
      description: req.body.description,
    });

    return res.json({
      success: 200,
      message: "OrderHistory successfully added.",
    });
  } catch (error) {
    console.log("Error with adding thought: ", error);
    return res.json({
      success: false,
      message: "Error with adding thought. See server console for more info.",
    });
  }
};

const getOrder = async (req, res) => {
  try {
    const roomName = req.query.roomName;
    const shopName = req.query.shopName;
    const orderHistory = await OrderHistory.find({roomName}).select(["-__v"]);

    console.log(orderHistory);

    return res.json({
      success: 200,
      order: orderHistory,
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

module.exports = {
  addOrder,
  getOrder,
};
