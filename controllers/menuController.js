const MenuSchema = require("../models/Menu");

exports.getDeliveryInfo = async (req, res) => {
  await import("node-fetch")
    .then((module) => {
      const fetch = module.default;
      const shopUrl = req.query.shopUrl;
      const API = `https://gappapi.deliverynow.vn/api/delivery/get_from_url?url=${shopUrl}`;

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
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`${API} is response with ${response.status}`);
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

exports.getResInfo = async (req, res) => {
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

exports.getResDishes = async (req, res) => {
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

exports.getMenuByDeliveryId = async (req, res) => {
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
