const mongoose = require("mongoose");
const Order = require("../models/Order");

const SUCCESS = "200";

const connectDB = async () => {
  try {
    mongoose.connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    });

    console.log("MongoDB connected successfully");

    const connection = mongoose.connection;

    connection.once("open", () => {
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
            // newOrder.createdTime = new Date(
            //   change.fullDocument.createdTime
            // ).toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
            let orderResult = {};
            orderResult.status = SUCCESS;
            orderResult.newOrder = newOrder;

            console.log(
              `Mongoose successfully created ${change.documentKey._id}`
            );

            global.io.emit("new-order", orderResult);
            break;

          case "update":
            const updatedOrder = await Order.findById(
              change.documentKey._id
            ).select(["-__v"]);

            let updatedResult = {};
            updatedResult.status = SUCCESS;
            updatedResult.updatedOrder = updatedOrder;

            console.log(
              `Mongoose successfully updated ${change.documentKey._id}`
            );

            global.io.emit("update-order", updatedResult);
            break;

          case "delete":
            console.log(
              `Mongoose successfully deleted ${change.documentKey._id}`
            );
            break;
        }
      });
    });

    return connection;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
