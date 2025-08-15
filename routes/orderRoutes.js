const express = require("express");
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

router.post("/", createOrder);
router.get("/", getAllOrders);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
