const express = require("express");
const router = express.Router();
const { getAllProducts } = require("../controllers/productController");
const { getDropshoulderProducts } = require("../controllers/productController");
const { getOldMoneyPoloProducts } = require("../controllers/productController");
const { getProductById } = require("../controllers/productController");

router.get("/", getAllProducts);
// Route to get all dropshoulder products
router.get("/dropshoulder", getDropshoulderProducts);
router.get("/old-money-polo", getOldMoneyPoloProducts);
router.get("/:id", getProductById);

module.exports = router;
