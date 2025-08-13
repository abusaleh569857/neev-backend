const db = require("../config/db");

// Fetch ALL products (not just trending)
exports.getAllProducts = (req, res) => {
  const sql = "SELECT * FROM products";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

exports.getAllTrendingProducts = (req, res) => {
  console.log("Fetching products...");

  // SQL query to get all products where is_trending is TRUE
  const sql = "SELECT * FROM products WHERE is_trending = true";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Database query error" });
    }

    // Return the results as JSON response
    res.json(results);
  });
};

exports.getDropshoulderProducts = (req, res) => {
  const sql = `
    SELECT 
      p.id, p.title, p.imageUrl, p.description, 
      p.quantity, p.available_quantity, p.price, 
      pd.discount_percentage
    FROM products p
    JOIN product_categories pc ON p.id = pc.product_id
    JOIN categories c ON c.id = pc.category_id
    LEFT JOIN product_discounts pd 
      ON p.id = pd.product_id 
      AND CURDATE() BETWEEN pd.start_date AND pd.end_date
    WHERE c.title = 'Dropshoulder';
  `;

  console.log("📥 Executing SQL query:\n", sql);

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Database query error:", err);
      return res.status(500).json({ error: "Database query error" });
    }

    console.log("✅ Raw query results:", results);

    const productsWithDiscount = results.map((product) => {
      const discountPercentage = product.discount_percentage || 0;
      const discountedPrice =
        product.price - (product.price * discountPercentage) / 100;

      // Round the discounted price to the nearest whole number
      const roundedDiscountedPrice = Math.round(discountedPrice);

      return {
        ...product,
        discount_percentage: discountPercentage,
        discountedPrice: roundedDiscountedPrice, // rounded to the nearest whole number
      };
    });

    console.log("🛒 Final products with discounts:\n", productsWithDiscount);

    res.json(productsWithDiscount);
  });
};

exports.getOldMoneyPoloProducts = (req, res) => {
  const sql = `
    SELECT 
      p.id, p.title, p.imageUrl, p.description, 
      p.quantity, p.available_quantity, p.price, 
      pd.discount_percentage
    FROM products p
    JOIN product_categories pc ON p.id = pc.product_id
    JOIN categories c ON c.id = pc.category_id
    LEFT JOIN product_discounts pd 
      ON p.id = pd.product_id 
      AND CURDATE() BETWEEN pd.start_date AND pd.end_date
    WHERE c.title = 'Old Money Polo';
  `;

  console.log("📥 Executing SQL query:\n", sql);

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Database query error:", err);
      return res.status(500).json({ error: "Database query error" });
    }

    console.log("✅ Raw query results:", results);

    const productsWithDiscount = results.map((product) => {
      const discountPercentage = product.discount_percentage || 0;
      const discountedPrice =
        product.price - (product.price * discountPercentage) / 100;

      // Round the discounted price to the nearest whole number
      const roundedDiscountedPrice = Math.round(discountedPrice);

      return {
        ...product,
        discount_percentage: discountPercentage,
        discountedPrice: roundedDiscountedPrice, // rounded to the nearest whole number
      };
    });

    console.log("🛒 Final products with discounts:\n", productsWithDiscount);

    res.json(productsWithDiscount);
  });
};

exports.getProductById = (req, res) => {
  const productId = req.params.id;

  const sql = `
    SELECT 
      p.id, p.title, p.imageUrl, p.description, p.quantity, 
      p.available_quantity, p.price, p.color, pd.discount_percentage
    FROM products p
    LEFT JOIN product_discounts pd 
      ON p.id = pd.product_id 
      AND CURDATE() BETWEEN pd.start_date AND pd.end_date
    WHERE p.id = ?;
  `;

  db.query(sql, [productId], (err, results) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = results[0];
    const price = parseFloat(product.price);
    const discount = parseFloat(product.discount_percentage) || 0;
    const discountedPrice = price - (price * discount) / 100;

    // Round the discounted price to the nearest whole number
    const roundedDiscountedPrice = Math.round(discountedPrice);

    const formattedProduct = {
      ...product,
      discount_percentage: discount,
      discountedPrice: roundedDiscountedPrice, // rounded to the nearest whole number
    };

    res.json(formattedProduct);
  });
};

// ✅ Update Product
exports.updateProduct = (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    imageUrl,
    quantity,
    available_quantity,
    price,
    is_trending,
    color,
  } = req.body;

  const sql = `
    UPDATE products
    SET title = ?, description = ?, imageUrl = ?, quantity = ?, 
        available_quantity = ?, price = ?, is_trending = ?, color = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      title,
      description,
      imageUrl,
      quantity,
      available_quantity,
      price,
      is_trending,
      color,
      id,
    ],
    (err, result) => {
      if (err) {
        console.error("Update Error:", err);
        return res.status(500).json({ error: "Update failed" });
      }
      res.json({ message: "Product updated successfully" });
    }
  );
};

// ✅ Delete Product
exports.deleteProduct = (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM products WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Delete Error:", err);
      return res.status(500).json({ error: "Delete failed" });
    }
    res.json({ message: "Product deleted successfully" });
  });
};

// Create Product with Categories
exports.createProduct = (req, res) => {
  const {
    title,
    description,
    imageUrl,
    price,
    quantity,
    available_quantity,
    color,
    is_trending,
    categoryIds, // Expect an array of category IDs from front-end
  } = req.body;

  const sql = `
    INSERT INTO products
      (title, description, imageUrl, price, quantity, available_quantity, color, is_trending)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      title,
      description,
      imageUrl,
      price,
      quantity,
      available_quantity,
      color,
      is_trending,
    ],
    (err, result) => {
      if (err) {
        console.error("Error inserting product:", err);
        return res
          .status(500)
          .json({ error: "Database error on insert product" });
      }

      const newProductId = result.insertId;
      if (Array.isArray(categoryIds) && categoryIds.length > 0) {
        const values = categoryIds.map((catId) => [newProductId, catId]);
        const insertCategoriesSql = `
          INSERT INTO product_categories (product_id, category_id)
          VALUES ?
        `;
        db.query(insertCategoriesSql, [values], (err2) => {
          if (err2) {
            console.error("Error inserting categories:", err2);
            return res
              .status(500)
              .json({ error: "Database error on product categories" });
          }
          return res
            .status(201)
            .json({ message: "Product created with categories" });
        });
      } else {
        return res
          .status(201)
          .json({ message: "Product created without categories" });
      }
    }
  );
};
