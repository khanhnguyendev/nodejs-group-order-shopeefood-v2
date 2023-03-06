const { addOrder, getOrder, getDeliveryInfo, getResInfo, getResDishes } = require("../controllers/orderController"),
  express = require("express"),
  router = express.Router();

router.post("/addOrder", addOrder);
router.get("/getOrder", getOrder);
router.get("/getDeliveryInfo/", getDeliveryInfo);
router.get("/getResInfo/", getResInfo);
router.get("/getResDishes/", getResDishes);

module.exports = router;
