const { addOrder, getOrder, getDeliveryInfo, getResInfo, getResDishes, getMenuByDeliveryId, findRoomByRoomName, getAllHistoryRoomName} = require("../controllers/orderController"),
  express = require("express"),
  router = express.Router();

router.post("/addOrder", addOrder);
router.get("/getOrder", getOrder);
router.get("/getDeliveryInfo/", getDeliveryInfo);
router.get("/getResInfo/", getResInfo);
router.get("/getResDishes/", getResDishes);
router.get("/getMenuByDeliveryId", getMenuByDeliveryId);
router.get("/findRoomByRoomName", findRoomByRoomName);
router.get("/getAllHistoryRoomName", getAllHistoryRoomName);

module.exports = router;
