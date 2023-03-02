const express = require("express"),
  mongoose = require("mongoose"),
  bodyParser = require("body-parser"),
  orderRoutes = require("./routes/orderRoutes"),
  cors = require("cors"),
  fs = require("fs"),
  axios = require('axios');
const OrderHistory = require("./models/OrderHistory");
morgan = require("morgan"),
  path = require("path");

cron = require("node-cron");

// Use env port or default
const port = process.env.PORT || 5000;
const baseUrl = process.env.BASE_URL || "http://localhost:5000";

// TODO: add to config file
const CONNECTION = "CONNECTION";
const DATA = "DATA";
const DEBUG = "DEBUG";
const SUCCESS = "200";
const ERROR = "400";
const AUTHORITY = "401";
const PERMISSION_DENIED = "500";

//establish socket.io connection
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

//start the server
server.listen(port, () => {
  console.log(`Server now running on port ${port}!`)
  console.log(`http://localhost:${port}`)
});

//connect to db
mongoose.connect(process.env.DB_URI || require("./config/config").db.uri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

const connection = mongoose.connection;

connection.once("open", () => {
  console.log("MongoDB database connected");

  console.log("Setting change streams");
  const thoughtChangeStream = connection.collection("orderhistories").watch();

  thoughtChangeStream.on("change", async (change) => {
    switch (change.operationType) {
      case "insert":
        const newOrder = {
          _id: change.fullDocument._id,
          shopName: change.fullDocument.shopName,
          roomName: change.fullDocument.roomName,
          orderUser: change.fullDocument.orderUser,
          foodTitle: change.fullDocument.foodTitle,
          foodPrice: change.fullDocument.foodPrice,
          foodQty: change.fullDocument.foodQty,
          foodNote: change.fullDocument.foodNote,
          createdTime: change.fullDocument.createdTime,
          updatedTime: change.fullDocument.updatedTime,
        };

        let orderResult = {}
        orderResult.status = SUCCESS;
        orderResult.newOrder = newOrder


        io.emit("new-order", orderResult);
        break;

      case "update":

        const updatedOrder = await OrderHistory.find({ _id: change.documentKey._id }).select(["-__v"]);

        let updatedResult = {}
        updatedResult.status = SUCCESS;
        updatedResult.updatedOrder = updatedOrder[0]

        io.emit("update-order", updatedResult);
        break;

      case "delete":

        let deleteResult = {}
        deleteResult.status = SUCCESS;
        deleteResult.deleteId = change.documentKey._id
        io.emit("delete-order", deleteResult);
        break;
    }
  });
});

//schedule deletion of thoughts at midnight
cron.schedule("0 0 0 * * *", async () => {
  await connection.collection("thoughts").drop();

  io.of("/api/socket").emit("thoughtsCleared");
});

connection.on("error", (error) => console.log("Error: " + error));

app.use(cors());

//morgan used for logging HTTP requests to the console
app.use(morgan("dev"));

app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

const rooms = {};

//bodyParser middleware used for resolving the req and res body objects (urlEncoded and json formats)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//add routers
app.use("/api/", orderRoutes);

app.get("/", (req, res) => {
  res.render("index", { rooms: rooms });
});

app.post("/room", (req, res) => {
  // Handle url not available
  if (rooms[req.body.orderShopName] != null) {
    return res.redirect("/");
  }

  // Clear menu before create new room
  fs.writeFile(__dirname + "/dataJSON/menu.json", "[]", function () {
    logWriter(DATA, "Menu has been reset");
  });

  // Clear order log before create new room
  fs.writeFile(__dirname + "/dataJSON/orders.json", "[]", function () {
    logWriter(DATA, "Order log has been cleared");
  });

  roomName = req.body.orderShopName
  rooms[roomName] = { users: {} };

  // Get shop url
  shopUrl = req.body.orderShopUrl;

  res.redirect(roomName);
});

// Render room page
app.get("/:room", async (req, res) => {
  const room = rooms[req.params.room];
  if (!room) {
    return res.redirect("/");
  }

  const menuInfo = fs.readFileSync(__dirname + "/dataJSON/menu.json");
  if (menuInfo.length < 3) {
    return fetchShopeeFood(req, res);
  }

  const ordersHistory = fs.readFileSync(__dirname + "/dataJSON/orders.json");

  const orderJson = await fetchingOrder()

  res.render("room", {
    roomName: req.params.room,
    resName: restaurantName,
    foods: JSON.parse(menuInfo),
    orders: orderJson,
    sumOrders: summaryOrders(JSON.parse(ordersHistory)),
    totalItems: JSON.parse(ordersHistory).length,
    totalPrice: calTotalPrice(JSON.parse(ordersHistory)),
  });
});

async function fetchingOrder() {
  try {
    const orderResult = await axios.get(`${baseUrl}/API/getOrder`);
    if (orderResult?.data) {
      console.log(orderResult.data);
      return orderResult.data.order
    }
    return orderResult;
  } catch (error) {
    console.error(error);
  }
}

io.on("connection", (socket) => {
  socket.on("new-user", (room, name) => {
    socket.join(room);
    rooms[room].users[socket.id] = name;
    socket.to(room).broadcast.emit("user-connected", name);
    logWriter(CONNECTION, name + " connected to " + room);
  });

  socket.on("old-user", (room, name) => {
    socket.join(room);
    rooms[room].users[socket.id] = name;
    socket.to(room).broadcast.emit("user-connected", name);
    logWriter(CONNECTION, name + " connected to " + room);
  });

  socket.on("disconnect", () => {
    getUserRooms(socket).forEach((room) => {
      socket
        .to(room)
        .broadcast.emit("user-disconnected", rooms[room].users[socket.id]);
      logWriter(
        CONNECTION,
        rooms[room].users[socket.id] + " disconnect to " + room
      );
      delete rooms[room].users[socket.id];
    });
  });

  // Order API
  socket.on("order", async (orderReq) => {
    let clientIp = socket.request.connection.remoteAddress.replace("::ffff:", "");

    console.log(`Order from ${clientIp} to ${orderReq.roomName}@${orderReq.shopName}`);

    let roomName = orderReq.roomName
    let shopName = orderReq.shopName
    let orderUser = orderReq.orderUser
    let foodTitle = orderReq.foodTitle
    let foodPrice = priceParser(orderReq.foodPrice)
    let foodQty = parseInt(orderReq.foodQty)
    let foodNote = orderReq.foodNote
    let ipUser = clientIp;


    try {
      // Check if there is an existing order with the same roomName, orderUser, foodTitle 
      let historyOrder = await OrderHistory.findOne({ roomName, orderUser, foodTitle, ipUser });

      if (historyOrder) {
        // If an existing order is found, update the foodQty, updatedTime
        historyOrder.foodQty += foodQty;
        historyOrder.updatedTime = new Date()
        historyOrder.__v += 1
        await historyOrder.save();

        console.log(`Order updated: \n ${JSON.stringify(historyOrder)}`);

      } else {
        // If no existing order is found, create a new order
        const newOrder = new OrderHistory({
          roomName: roomName,
          shopName: shopName,
          orderUser: orderUser,
          foodTitle: foodTitle,
          foodPrice: foodPrice,
          foodQty: foodQty,
          foodNote: foodNote,
          ipUser: ipUser,
          createdTime: new Date(),
          updatedTime: new Date()
        })

        await newOrder.save();

        console.log(`New order created: \n ${JSON.stringify(newOrder)}`);

      }
    } catch (error) {
      console.log('Error with creating order:', error);
    }
  })

  // Delete API
  socket.on("delete", async (deletedReq) => {
    let clientIp = socket.request.connection.remoteAddress.replace("::ffff:", "");

    console.log(`Delete order from ${deletedUser}@${clientIp} to ${deletedReq.roomName}@${deletedReq.shopName}`);

    let roomName = deletedReq.roomName
    let deletedUser = deletedReq.deleteUser

    let historyOrder = await OrderHistory.findOne({ _id: deletedReq.orderId });

    if (!historyOrder || historyOrder.roomName != roomName || historyOrder.orderUser != deletedUser || historyOrder.ipUser != clientIp) {
      console.log(`User ${deletedUser}@${clientIp} permission denied: \nOrderId`, deletedReq.orderId);
      let deleteResult = {}
      deleteResult.status = PERMISSION_DENIED
      deleteResult.order = historyOrder
      return io.emit("delete-order", deleteResult);
    }
    const deletedOrder = await OrderHistory.findOneAndDelete({ _id: deletedReq.orderId });
    if (!deletedOrder) {
      console.log(`Error with deleting order: \n`, deletedOrder);      
      // let deleteResult = {}
      // deleteResult.status = PERMISSION_DENIED
      // deleteResult.order = historyOrder
      // return io.emit("delete-order", deleteResult);
    }
  })

});


// String price to int
function priceParser(strPrice) {
  return parseInt(strPrice.replace(/[^\d]/g, ""));
}

// Get user in room
function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name);
    return names;
  }, []);
}

// Get current date time
function getDateTime() {
  var currentDate = new Date();
  return (
    "[" +
    String(currentDate.getDate()).padStart(2, "0") +
    "/" +
    String(currentDate.getMonth() + 1).padStart(2, "0") +
    "/" +
    currentDate.getFullYear() +
    " @ " +
    String(currentDate.getHours()).padStart(2, "0") +
    ":" +
    String(currentDate.getMinutes()).padStart(2, "0") +
    ":" +
    String(currentDate.getSeconds()).padStart(2, "0")
  );
}

// Log Writer
function logWriter(type, message) {
  console.log(getDateTime() + " " + type + "] " + message);
}

async function fetchShopeeFood(req, res) {
  getResId(req, res);
}

// Get Restaurant ID
async function getResId(req, res) {
  import("node-fetch")
    .then((module) => {
      const fetch = module.default;

      fetch(
        "https://gappapi.deliverynow.vn/api/delivery/get_from_url?url=" +
        shopUrl.replace("https://shopeefood.vn/", ""),
        {
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
        .then((deliveryInfo) => {
          logWriter(DEBUG, "Get delivery info successful");
          getRestaurantName(deliveryInfo, req, res);
        })
        .catch((error) => {
          logWriter(
            DEBUG,
            "There has been a problem with your fetch operation" + error
          );
          logWriter(DEBUG, "getResId " + error);
        });
    })
    .catch((error) => console.error(error));
}

// Get Restaurant Name
async function getRestaurantName(deliveryInfo, req, res) {
  let API = `https://gappapi.deliverynow.vn/api/delivery/get_detail?id_type=2&request_id=${deliveryInfo.reply.delivery_id}`;

  import("node-fetch")
    .then((module) => {
      const fetch = module.default;

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
        .then((json) => {
          logWriter(DEBUG, "Get restaurant name successful");
          restaurantName = json.reply.delivery_detail.name;
          getDeliveryDishes(deliveryInfo, req, res);
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
}

async function getDeliveryDishes(deliveryInfo, req, res) {
  let urlAPI = `https://gappapi.deliverynow.vn/api/dish/get_delivery_dishes?id_type=2&request_id=${deliveryInfo.reply.delivery_id}`;

  import("node-fetch")
    .then((module) => {
      const fetch = module.default;

      fetch(urlAPI, {
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
        .then((json) => {
          logWriter(DEBUG, "Get delivery detail successful");
          // Filter menu list
          getMenuJson(json, req, res);
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
}

/**
 * Get menu list
 */
function getMenuJson(json, req, res) {
  let menuJson = [];
  json.reply.menu_infos.forEach((menuInfo) => {
    menuInfo.dishes.forEach((dish) => {
      let menu = {
        title: dish.name,
        image: dish.photos[1].value,
        des: dish.description,
        price: dish.price.text,
      };
      menuJson.push(menu);
    });
  });

  // Write to file
  saveMenuJson(menuJson, req, res);
}

/**
 * Saving menu list to file
 */
async function saveMenuJson(menuJson, req, res) {
  fs.writeFile(
    __dirname + "/dataJSON/menu.json",
    JSON.stringify(menuJson),
    "utf8",
    function (err) {
      if (err) {
        logWriter(DEBUG, "An error occured while writing JSON Object to File.");
        return logWriter(err);
      }
      logWriter(DEBUG, "Saving menu JSON complete...");
    }
  );

  const orderJson = await fetchingOrder()

  res.render("room", {
    roomName: req.params.room,
    resName: restaurantName,
    foods: menuJson,
    orders: orderJson,
    sumOrders: orderJson,
    totalItems: 0,
    totalPrice: 0,
  });
}

function summaryOrders(ordersJson) {
  let sumOrders = [];

  for (let i = 0; i < ordersJson.length; i++) {
    let foodTitle = ordersJson[i].foodTitle;
    let foodQty = parseInt(ordersJson[i].foodQty);
    let foodPrice = parseInt(ordersJson[i].foodPrice);

    let order = {};

    if (order[foodTitle]) {
      order.foodTitle = foodTitle;
      order.foodQty += foodQty;
    } else {
      order.foodTitle = foodTitle;
      order.foodQty = foodQty;
    }
    order.foodPrice = foodPrice * foodQty;
    sumOrders.push(order);
  }

  return sumOrders;
}

function calTotalPrice(ordersJson) {
  let totalPrice = 0;
  for (let i = 0; i < ordersJson.length; i++) {
    totalPrice += parseInt(ordersJson[i].foodPrice);
  }
  return `${totalPrice},000đ`;
}