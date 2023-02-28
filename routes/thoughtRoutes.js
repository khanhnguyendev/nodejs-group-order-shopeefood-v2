const { addOrder, getOrder } = require("../controllers/thoughtController"),
  express = require("express"),
  router = express.Router();

router.post("/addOrder", addOrder);
router.get("/getOrder", getOrder);
router.post("/room", (req, res) => {
  // You can do validation or database stuff before emiting
  req.io.emit("room-created", req.body.orderShopName);
  return res.send({ success: true });
});

module.exports = router;
