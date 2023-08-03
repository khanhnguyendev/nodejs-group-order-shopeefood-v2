const OrderSchema = require("../models/Order");
const RoomSchema = require("../models/Room");
const MenuSchema = require("../models/Menu");

const getDeliveryInfo = async (req, res) => {
  await import("node-fetch")
    .then((module) => {
      const fetch = module.default;
      const shopUrl = req.query.shopUrl;
      const API = `https://gappapi.deliverynow.vn/api/delivery/get_from_url?url=${shopUrl}`
      
      fetch(API, {
          method: "GET",
          headers: {
            "x-foody-access-token": "",
            "x-foody-api-version": "1",
            "x-foody-app-type": "1004",
            "x-foody-client-id": "",
            "x-foody-client-language": "en",
            "x-foody-client-type": "1",
            "x-foody-client-version": "3.0.0",
          },
        }
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not OK");
          }
          return response.json();
        })
        .then((data) => {
          return res.json(data);
        })
        .catch((error) => {
          console.log(`Get delivery info failed: \n ${error}`);
        });
    })
    .catch((error) => console.error(error));
};

const getResInfo = async (req, res) => {
  await import("node-fetch")
    .then((module) => {
      const fetch = module.default;
      const deliveryId = req.query.requestId;
      const API = `https://gappapi.deliverynow.vn/api/delivery/get_detail?id_type=2&request_id=${deliveryId}`;

      fetch(API, {
        method: "GET",
        headers: {
          "x-foody-client-id": "",
          "x-foody-client-type": "1",
          "x-foody-app-type": "1004",
          "x-foody-client-version": "3.0.0",
          "x-foody-api-version": "1",
          "x-foody-client-language": "vi",
          "x-foody-access-token":
            "6cf780ed31c8c4cd81ee12b0f3f4fdaf05ddf91a29ffce73212e4935ed9295fd354df0f4bc015478450a19bf80fddbe13302a61aa0c705af8315aae5a8e9cd6b",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not OK");
          }
          return response.json();
        })
        .then((data) => {
          return res.json(data);
        })
        .catch((error) => {
          logWriter(
            DEBUG,
            "There has been a problem with your fetch operation"
          );
          logWriter(DEBUG, "getRestaurantName " + error);
        });
    })
    .catch((error) => console.error(error));
};

const getResDishes = async (req, res) => {

  await import("node-fetch")
    .then((module) => {
      const fetch = module.default;
      const deliveryId = req.query.requestId;
      const API = `https://gappapi.deliverynow.vn/api/dish/get_delivery_dishes?id_type=2&request_id=${deliveryId}`;

      fetch(API, {
        method: "GET",
        headers: {
          "x-foody-client-id": "",
          "x-foody-client-type": "1",
          "x-foody-app-type": "1004",
          "x-foody-client-version": "3.0.0",
          "x-foody-api-version": "1",
          "x-foody-client-language": "vi",
          "x-foody-access-token":
            "6cf780ed31c8c4cd81ee12b0f3f4fdaf05ddf91a29ffce73212e4935ed9295fd354df0f4bc015478450a19bf80fddbe13302a61aa0c705af8315aae5a8e9cd6b",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not OK");
          }
          return response.json();
        })
        .then((data) => {
          return res.json(data);
        })
        .catch((error) => {
          logWriter(
            DEBUG,
            "There has been a problem with your fetch operation"
          );
          logWriter(DEBUG, "getDeliveryDishes " + error);
        });
    })
    .catch((error) => console.error(error));
};

const getMenuByDeliveryId = async (req, res) => {
  try {
    const deliveryId = req.query.requestId;
    const menus = await MenuSchema.find({ deliveryId });

    return res.json({
      result: 200,
      reply: menus,
    });
  } catch (error) {
    console.log("Error with adding thought: ", error);
    return res.json({
      result: false,
      reply: "Error with adding thought. See server console for more info.",
    });
  }
};

const addOrder = async (req, res) => {
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

const getOrder = async (req, res) => {
  try {
    const roomId = req.query.roomId;
    const deliveryId = req.query.requestId;

    const orders = await OrderSchema.find({ roomId, deliveryId }).select(["-__v"]);

    return res.json({
      result: 200,
      reply: orders,
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

const findRoomByRoomName = async (req, res) => {
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
}

const getAllHistoryRoomName = async (req, res) => {
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
}

module.exports = {
  addOrder,
  getOrder,
  getDeliveryInfo,
  getResInfo,
  getResDishes,
  getMenuByDeliveryId,
  findRoomByRoomName,
  getAllHistoryRoomName
};
