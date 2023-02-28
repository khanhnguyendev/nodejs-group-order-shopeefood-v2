const { addOrder, getOrder } = require("../controllers/orderController"),
  express = require("express"),
  router = express.Router();

router.post("/addOrder", addOrder);
router.get("/getOrder", getOrder);

module.exports = router;
