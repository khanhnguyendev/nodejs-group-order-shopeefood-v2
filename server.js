require("dotenv").config();
const express = require("express"),
  mongoose = require("mongoose"),
  bodyParser = require("body-parser"),
  orderRoutes = require("./routes/orderRoutes"),
  cors = require("cors"),
  fs = require("fs"),
  axios = require("axios");

const RoomSchema = require("./models/Room");
const MenuSchema = require("./models/Menu");
const OrderSchema = require("./models/Order");

(morgan = require("morgan")), (path = require("path"));

cron = require("node-cron");

// Use env port or default
const port = process.env.PORT || 3000;
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

// TODO: add to config file
const CONNECTION = "CONNECTION";
const DATA = "DATA";
const DEBUG = "DEBUG";
const SUCCESS = "200";
const ERROR = "400";
const AUTHORITY = "401";
const UNKNOWN_VALUE = "500";
const PERMISSION_DENIED = "500";
const UNAVAILABLE_VALUE = "503";

//establish socket.io connection
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

//start the server
server.listen(port, () => {
  console.log(`Server now running on port ${port}!`);
  console.log(`http://localhost:${port}`);
});

//connect to db
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

const connection = mongoose.connection;

connection.once("open", () => {
  console.log("MongoDB database connected");

  console.log("Setting change streams for orders collection...");
  const thoughtChangeStream = connection.collection("orders").watch();

  thoughtChangeStream.on("change", async (change) => {
    switch (change.operationType) {
      case "insert":
        const newOrder = {
          _id: change.fullDocument._id,
          roomId: change.fullDocument.roomId,
          deliveryId: change.fullDocument.deliveryId,
          orderUser: change.fullDocument.orderUser,
          ipUser: change.fullDocument.ipUser,
          foodTitle: change.fullDocument.foodTitle,
          foodImage: change.fullDocument.foodImage,
          foodPrice: change.fullDocument.foodPrice,
          foodQty: change.fullDocument.foodQty,
          foodNote: change.fullDocument.foodNote,
          createdTime: change.fullDocument.createdTime,
          updatedTime: change.fullDocument.updatedTime,
        };

        let orderResult = {};
        orderResult.status = SUCCESS;
        orderResult.newOrder = newOrder;

        console.log(`Mongoose successfully created ${change.documentKey._id}`);

        io.emit("new-order", orderResult);
        break;

      case "update":
        const updatedOrder = await OrderSchema.find({
          _id: change.documentKey._id,
        }).select(["-__v"]);

        let updatedResult = {};
        updatedResult.status = SUCCESS;
        updatedResult.updatedOrder = updatedOrder[0];

        console.log(`Mongoose successfully updated ${change.documentKey._id}`);

        io.emit("update-order", updatedResult);
        break;

      case "delete":
        console.log(`Mongoose successfully deleted ${change.documentKey._id}`);
        break;
    }
  });
});

//schedule deletion of rooms at midnight
// cron.schedule("0 0 0 * * *", async () => {
//   await connection.collection("rooms").drop();

//   io.of("/api/socket").emit("thoughtsCleared");
// });

connection.on("error", (error) => console.log("Error: " + error));

app.use(cors());

//morgan used for logging HTTP requests to the console
app.use(morgan("dev"));

app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

const rooms = {};
let roomName = "";
let roomId = "";
let deliveryId = "";
let restaurantId = "";
let restaurantName = "";

//bodyParser middleware used for resolving the req and res body objects (urlEncoded and json formats)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//add routers
app.use("/api/", orderRoutes);

app.get("/", (req, res) => {
  res.render("index", { rooms: rooms });
});

app.get("/profile/:userName", (req, res) => {
  let userInfo = {};
  userInfo.name = "Test";
  res.render("profile", { userInfo: userInfo });
});

// Create a new room
app.post("/room", async (req, res) => {
  // Handle url not available
  if (rooms[req.body.orderShopName] != null) {
    return res.redirect("/");
  }

  roomName = req.body.orderShopName;

  // Check if room exists already
  const response = await axios.get(
    `${baseUrl}/API/findRoomByRoomName?roomName=${roomName}`
  );

  // Assuming the API responds with an array of room objects, each having a "roomName" field
  const historyRoomNames = response.data.reply;

  // Check if req.body.orderShopName exists in any of the roomName fields
  const isOrderShopNameFound = historyRoomNames.some(
    (room) => room.roomName === roomName
  );

  if (isOrderShopNameFound) {
    // If room exists already
    return res.json({
      success: false,
      message: `Room name "${roomName}" already exists. Please choose a new room name!`,
    });
  }

  rooms[roomName] = { users: {} };
  shopUrl = req.body.orderShopUrl.replace("https://shopeefood.vn/", "");
  let restaurantDes = "";

  const deliveryInfo = await axios.get(
    `${baseUrl}/API/getDeliveryInfo?shopUrl=${shopUrl}`
  );
  if (deliveryInfo.data.result == "success") {
    restaurantId = deliveryInfo.data.reply.restaurant_id;
    deliveryId = deliveryInfo.data.reply.delivery_id;
  }

  if (deliveryId) {
    const restaurantInfo = await axios.get(
      `${baseUrl}/API/getResInfo?requestId=${deliveryId}`
    );
    if (restaurantInfo.data.result == "success") {
      restaurantName = restaurantInfo.data.reply.delivery_detail.name;
      restaurantDes =
        restaurantInfo.data.reply.delivery_detail.short_description;
    }
  }

  const room = await RoomSchema.findOne({ roomName, restaurantId, deliveryId });
  if (!room) {
    const roomSchema = new RoomSchema({
      roomName: roomName,
      deliveryId: deliveryId,
      shopId: restaurantId,
      shopName: restaurantName,
      description: restaurantDes,
      capacity: 99,
      createdAt: new Date(),
    });
    await roomSchema.save();
    roomId = roomSchema._id;
  } else {
    roomId = room._id;
  }

  const menu = await MenuSchema.find({ deliveryId });

  if (menu.length == 0) {
    const resDishes = await axios.get(
      `${baseUrl}/API/getResDishes?&requestId=${deliveryId}`
    );
    if (resDishes.data.result == "success") {
      const menuInfo = resDishes.data.reply.menu_infos;

      menuInfo.forEach((menuInfo) => {
        menuInfo.dishes.forEach((dish) => {
          const menuSchema = new MenuSchema({
            room: roomId,
            deliveryId: deliveryId,
            title: dish.name,
            image: dish.photos[1].value,
            price: priceParser(dish.price.text),
            discountPrice:
              dish.discount_price != null
                ? priceParser(dish.discount_price.text)
                : "",
            description: dish.description,
          });
          menuSchema.save();
        });
      });
    }
  }

  res.redirect(roomName);
});

// Render room page
app.get("/:room", async (req, res) => {
  const room = rooms[req.params.room];
  if (!room) {
    return res.redirect("/");
  }

  const roomName = req.params.room;

  // Get room information
  const roomInfo = await RoomSchema.findOne({ roomName, deliveryId });

  roomId = roomInfo._id;

  // Get menu from database
  const menus = await getMenuByDeliveryId(deliveryId);

  // Get order history from database
  const orders = await getHistoryOrder(roomId, deliveryId);

  // Render for refresh or new connection
  res.render("room", {
    roomName: roomName,
    roomId: roomId,
    deliveryId: deliveryId,
    resName: restaurantName,
    foods: menus,
    orders: orders,
    sumOrders: summaryOrders(orders),
    totalItems: orders.reduce((acc, order) => acc + order.foodQty, 0),
    totalPrice: calTotalPrice(orders),
  });
});

async function getMenuByDeliveryId(deliveryId) {
  try {
    const menus = await axios.get(
      `${baseUrl}/API/getMenuByDeliveryId?requestId=${deliveryId}`
    );
    if (menus?.data && menus.data.result == SUCCESS) {
      return menus.data.reply;
    }
    return menus;
  } catch (error) {
    console.error(error);
  }
}

async function getHistoryOrder(roomId, deliveryId) {
  try {
    const orders = await axios.get(
      `${baseUrl}/API/getOrder?roomId=${roomId}&requestId=${deliveryId}`
    );
    if (orders?.data && orders.data.result == SUCCESS) {
      return orders.data.reply;
    }
    return orders;
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
    let clientIp = socket.request.connection.remoteAddress.replace(
      "::ffff:",
      ""
    );

    let orderUser = orderReq.orderUser;
    let foodTitle = orderReq.foodTitle;
    let foodImage = orderReq.foodImage;
    let foodPrice = priceParser(orderReq.foodPrice);
    let foodQty = parseInt(orderReq.foodQty);
    let foodNote = orderReq.foodNote;

    console.log(
      `Order from ${orderUser}@${clientIp} to ${orderReq.roomName}@${orderReq.shopName}`
    );

    try {
      const newOrder = new OrderSchema({
        roomId: roomId,
        deliveryId: deliveryId,
        orderUser: orderUser,
        ipUser: clientIp,
        foodTitle: foodTitle,
        foodImage: foodImage,
        foodPrice: foodPrice,
        foodQty: foodQty,
        foodNote: foodNote,
        createdTime: new Date(),
        updatedTime: new Date(),
      });

      await newOrder.save();

      console.log(`New order created: \n ${JSON.stringify(newOrder)}`);
    } catch (error) {
      let orderResult = {};
      orderResult.status = ERROR;
      orderResult.newOrder = orderReq;
      io.emit("new-order", orderResult);
      console.log("Error with creating order:", error);
    }
  });

  // Update API
  socket.on("update", async (orderReq) => {
    let clientIp = socket.request.connection.remoteAddress.replace(
      "::ffff:",
      ""
    );

    let orderUser = orderReq.orderUser;
    let orderId = orderReq.orderId;
    let foodQty = orderReq.foodQty;
    let foodNote = orderReq.foodNote;

    console.log(
      `Update order from ${orderUser}@${clientIp} to ${orderReq.roomName}@${orderReq.shopName}`
    );

    try {
      // Check if there is an existing order with the same roomId, deliveryId, orderId
      let historyOrder = await OrderSchema.findById(orderId);

      if (
        !historyOrder ||
        historyOrder.orderUser != orderUser ||
        historyOrder.ipUser != clientIp
      ) {
        console.log(
          `User ${orderUser}@${clientIp} permission denied\nOrderId: ${historyOrder._id}`
        );
        let updatedResult = {};
        updatedResult.status = PERMISSION_DENIED;
        updatedResult.updatedOrder = orderReq;
        return socket.emit("update-order", updatedResult);
      }

      if (historyOrder) {
        // Delele order if Qty = 0
        if (foodQty == 0) {
          return await deleteOrderById(orderId);
        }

        // If an existing order is found
        historyOrder.foodQty = foodQty;
        historyOrder.foodNote = foodNote;
        historyOrder.updatedTime = new Date();
        historyOrder.__v += 1;
        await historyOrder.save();

        console.log(`Order updated: \n ${JSON.stringify(historyOrder)}`);
      } else {
        let updatedResult = {};
        updatedResult.status = UNKNOWN_VALUE;
        updatedResult.updatedOrder = orderReq;

        io.emit("update-order", updatedResult);
      }
    } catch (error) {
      console.log("Error with creating order:", error);
    }
  });

  // Delete API
  socket.on("delete", async (deletedReq) => {
    let clientIp = socket.request.connection.remoteAddress.replace(
      "::ffff:",
      ""
    );
    let roomId = deletedReq.roomId;
    let deliveryId = deletedReq.deliveryId;
    let deletedUser = deletedReq.deleteUser;

    const room = await RoomSchema.findOne({ _id: roomId, deliveryId });
    if (room.length == 0) {
      console.log(`Error with deleting order: \n`, deletedReq);
      return;
    }

    console.log(
      `Delete order from ${deletedUser}@${clientIp} to ${room.roomName}@${room.shopName}`
    );

    let order = await OrderSchema.findOne({ _id: deletedReq.orderId });

    if (!order || order.orderUser != deletedUser || order.ipUser != clientIp) {
      console.log(
        `User ${deletedUser}@${clientIp} permission denied: \nOrderId`,
        deletedReq.orderId
      );
      let deleteResult = {};
      deleteResult.status = PERMISSION_DENIED;
      deleteResult.order = order;
      return socket.emit("delete-order", deleteResult);
    }

    await deleteOrderById(deletedReq.orderId);
  });
});

// Find and delete order by id
async function deleteOrderById(orderId) {
  const order = await OrderSchema.findOne({ _id: orderId });
  const deletedOrder = await OrderSchema.findOneAndDelete({
    _id: orderId,
  });
  if (!deletedOrder) {
    console.log(`Error with deleting order: \n`, deletedOrder);
    return;
    // let deleteResult = {}
    // deleteResult.status = PERMISSION_DENIED
    // deleteResult.order = historyOrder
    // return io.emit("delete-order", deleteResult);
  }
  let deleteResult = {};
  deleteResult.status = SUCCESS;
  deleteResult.order = order;
  return io.emit("delete-order", deleteResult);
}

// Summarize the orders
function summaryOrders(ordersJson) {
  const summary = ordersJson.reduce((acc, curr) => {
    const existing = acc.find((item) => item.foodTitle === curr.foodTitle);

    if (existing) {
      existing.foodQty += curr.foodQty;
      existing.totalPrice += curr.foodPrice;
      existing.foodNote.push({
        userName: curr.orderUser,
        note: curr.foodNote,
      });
    } else {
      acc.push({
        foodTitle: curr.foodTitle,
        foodNote: [
          {
            userName: curr.orderUser,
            note: curr.foodNote,
          },
        ],
        foodQty: curr.foodQty,
        totalPrice: curr.foodPrice,
      });
    }

    return acc;
  }, []);

  return summary;
}

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

// Log Writer
function logWriter(type, message) {
  console.log(getDateTime() + " " + type + "] " + message);
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

function calTotalPrice(ordersJson) {
  let totalPrice = 0;
  for (let i = 0; i < ordersJson.length; i++) {
    totalPrice +=
      parseInt(ordersJson[i].foodPrice) * parseInt(ordersJson[i].foodQty);
  }
  return formatPrice(totalPrice);
}

function formatPrice(value) {
  return value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}
