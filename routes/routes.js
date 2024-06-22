const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const orderController = require("../controllers/orderController");
const roomController = require("../controllers/roomController");

// Menu routes
router.get("/getDeliveryInfo/", menuController.getDeliveryInfo);
router.get("/getResInfo/", menuController.getResInfo);
router.get("/getResDishes/", menuController.getResDishes);
router.get("/getMenuByDeliveryId", menuController.getMenuByDeliveryId);

// Order routes
router.post("/addOrder", orderController.addOrder);
router.get("/getOrder", orderController.getOrder);

// Room routes
router.get("/findRoomByRoomName", roomController.findRoomByRoomName);
router.get("/getAllHistoryRoomName", roomController.getAllHistoryRoomName);

module.exports = router;
