const express = require("express");
const router = express.Router();

const {
  getAllProducts,
  getProductsBySearch,
  getAllTrendingProducts,
  getDropshoulderProducts,
  getOldMoneyPoloProducts,
  getProductByIdByAdmin,
  getProductById,
  getAllCategories,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

router.get("/", getAllProducts);
router.get("/search", getProductsBySearch);
router.get("/trending", getAllTrendingProducts);
router.get("/dropshoulder", getDropshoulderProducts);
router.get("/old-money-polo", getOldMoneyPoloProducts);
router.get("/categories", getAllCategories);
router.post("/", createProduct);
router.get("/admin/:id", getProductByIdByAdmin);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
