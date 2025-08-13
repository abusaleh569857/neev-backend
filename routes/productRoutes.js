const express = require("express");
const router = express.Router();
// const { getAllProducts } = require("../controllers/productController");
// const { getDropshoulderProducts } = require("../controllers/productController");
// const { getOldMoneyPoloProducts } = require("../controllers/productController");
// const { getProductById } = require("../controllers/productController");
const {
  getAllProducts,
  getAllTrendingProducts,
  getDropshoulderProducts,
  getOldMoneyPoloProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

router.get("/", getAllProducts);
router.get("/trending", getAllTrendingProducts);
// Route to get all dropshoulder products
router.get("/dropshoulder", getDropshoulderProducts);
router.get("/old-money-polo", getOldMoneyPoloProducts);
router.get("/:id", getProductById);
router.put("/:id", updateProduct); // Update a product
router.delete("/:id", deleteProduct); // Delete a product

module.exports = router;
