const axios = require("axios");
const { OrderSchema } = require("../models/Order"); // Ensure to import OrderSchema from correct path

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const SUCCESS = "200"; // Assuming this is defined somewhere in your project

// Function to get menu by delivery ID
async function fetchMenuByDeliveryId(deliveryId) {
  try {
    const menus = await axios.get(
      `${BASE_URL}/API/getMenuByDeliveryId?requestId=${deliveryId}`
    );
    console.log(menus);
    if (menus?.data && menus.data.result === SUCCESS) {
      return menus.data.reply;
    }
    return menus;
  } catch (error) {
    console.error(error);
    throw new Error(`Error fetching menu by delivery ID: ${error.message}`);
  }
}

// Function to get history order by room ID and delivery ID
async function fetchHistoryOrders(roomId, deliveryId) {
  try {
    const orders = await axios.get(
      `${BASE_URL}/API/getOrder?roomId=${roomId}&requestId=${deliveryId}`
    );
    if (orders?.data && orders.data.result === SUCCESS) {
      return orders.data.reply;
    }
    return orders;
  } catch (error) {
    console.error(error);
    throw new Error(`Error fetching history order: ${error.message}`);
  }
}

// Function to delete order by ID
async function deleteOrderById(orderId) {
  try {
    const order = await OrderSchema.findOne({ _id: orderId });
    const deletedOrder = await OrderSchema.findOneAndDelete({ _id: orderId });
    if (!deletedOrder) {
      console.log(`Error with deleting order: \n`, deletedOrder);
      return;
    }
    let deleteResult = {};
    deleteResult.status = SUCCESS;
    deleteResult.order = order;
    return deleteResult;
  } catch (error) {
    console.error(error);
    throw new Error(`Error deleting order by ID: ${error.message}`);
  }
}

// Function to summarize orders
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

// Function to get user rooms
function fetchUserInRooms(rooms, socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name);
    return names;
  }, []);
}

module.exports = {
  fetchMenuByDeliveryId,
  fetchHistoryOrders,
  deleteOrderById,
  summaryOrders,
  fetchUserInRooms,
};
