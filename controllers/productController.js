const db = require("../config/db");

exports.getAllProducts = (req, res) => {
  const sql = `
    SELECT
      p.id AS product_id,
      p.title,
      p.description,
      p.imageUrl,
      p.is_trending,
      GROUP_CONCAT(DISTINCT c.title) AS categories,
      v.id AS variant_id,
      v.color,
      v.size,
      v.price,
      v.quantity,
      v.available_quantity,
      IFNULL(d.discount_percentage,0) AS discount_percentage
    FROM products p
    LEFT JOIN product_categories pc ON p.id = pc.product_id
    LEFT JOIN categories c ON pc.category_id = c.id
    LEFT JOIN product_variants v ON p.id = v.product_id
    LEFT JOIN product_discounts d ON p.id = d.product_id
      AND NOW() BETWEEN d.start_date AND d.end_date
    GROUP BY p.id, v.id
    ORDER BY p.id, v.color, v.size
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    const productMap = {};

    results.forEach((row) => {
      if (!productMap[row.product_id]) {
        productMap[row.product_id] = {
          product_id: row.product_id,
          title: row.title,
          description: row.description,
          imageUrl: row.imageUrl,
          is_trending: row.is_trending,
          categories: row.categories ? row.categories.split(",") : [],
          variants: [],
        };
      }

      if (row.variant_id) {
        productMap[row.product_id].variants.push({
          variant_id: row.variant_id,
          color: row.color,
          size: row.size,
          price: parseFloat(row.price),
          quantity: parseInt(row.quantity),
          available_quantity: parseInt(row.available_quantity),
          discount_percentage: parseFloat(row.discount_percentage),
        });
      }
    });

    const products = Object.values(productMap);
    res.json(products);
  });
};

exports.getProductById = (req, res) => {
  const productId = req.params.id;

  const sql = `
    SELECT
      p.id,
      p.title,
      p.imageUrl,
      p.description,
      pv.color,
      pv.size,
      pv.price,
      pv.quantity,
      pv.available_quantity,
      pd.discount_percentage
    FROM products p
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN product_discounts pd
      ON p.id = pd.product_id
      AND CURDATE() BETWEEN pd.start_date AND pd.end_date
    WHERE p.id = ?;
  `;

  db.query(sql, [productId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = results[0];
    const price = parseFloat(product.price) || 0;
    const discount = parseFloat(product.discount_percentage) || 0;
    const discountedPrice = Math.round(price - (price * discount) / 100);

    const formattedProduct = {
      ...product,
      discount_percentage: discount,
      discountedPrice,
    };

    res.json(formattedProduct);
  });
};

exports.getProductByIdByAdmin = (req, res) => {
  const productId = req.params.id;
  const { color, size } = req.query;

  let sql = `
    SELECT
      p.id AS product_id,
      p.title,
      p.imageUrl,
      p.description,
      pv.id AS variant_id,
      pv.color,
      pv.size,
      pv.price,
      pv.quantity,
      pv.available_quantity,
      pd.discount_percentage
    FROM products p
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN product_discounts pd
      ON p.id = pd.product_id
      AND CURDATE() BETWEEN pd.start_date AND pd.end_date
    WHERE p.id = ?
  `;

  const params = [productId];

  if (color) {
    sql += " AND pv.color = ?";
    params.push(color);
  }
  if (size) {
    sql += " AND pv.size = ?";
    params.push(size);
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const discount = parseFloat(results[0].discount_percentage) || 0;

    const variants = results.map((row) => {
      const price = parseFloat(row.price) || 0;
      const discountedPrice = Math.round(price - (price * discount) / 100);
      return {
        variant_id: row.variant_id,
        color: row.color,
        size: row.size,
        price,
        quantity: parseInt(row.quantity),
        available_quantity: parseInt(row.available_quantity),
        discountedPrice,
      };
    });

    const formattedProduct = {
      id: results[0].product_id,
      title: results[0].title,
      description: results[0].description,
      imageUrl: results[0].imageUrl,
      discount_percentage: discount,
      variants,
    };

    res.json(formattedProduct);
  });
};

exports.getDropshoulderProducts = (req, res) => {
  const sql = `
    SELECT 
      p.id AS product_id,
      p.title, 
      p.imageUrl, 
      p.description, 
      pv.id AS variant_id,
      pv.color, 
      pv.size,
      pv.price,
      pd.discount_percentage
    FROM products p
    JOIN product_categories pc ON p.id = pc.product_id
    JOIN categories c ON c.id = pc.category_id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN product_discounts pd 
      ON p.id = pd.product_id 
      AND CURDATE() BETWEEN pd.start_date AND pd.end_date
    WHERE c.title = 'Dropshoulder';
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database query error" });

    const products = results.map((row) => ({
      product_id: row.product_id,
      title: row.title,
      imageUrl: row.imageUrl,
      description: row.description,
      color: row.color,
      size: row.size,
      price: parseFloat(row.price),
      discount_percentage: parseFloat(row.discount_percentage) || 0,
      discountedPrice: Math.round(
        row.price - (row.price * (row.discount_percentage || 0)) / 100
      ),
    }));

    res.json(products);
  });
};

exports.getOldMoneyPoloProducts = (req, res) => {
  const sql = `
    SELECT
      p.id AS product_id,
      p.title,
      p.imageUrl,
      p.description,
      pv.id AS variant_id,
      pv.color,
      pv.size,
      pv.price,
      pd.discount_percentage
    FROM products p
    JOIN product_categories pc ON p.id = pc.product_id
    JOIN categories c ON c.id = pc.category_id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN product_discounts pd
      ON p.id = pd.product_id
      AND CURDATE() BETWEEN pd.start_date AND pd.end_date
    WHERE c.title = 'Old Money Polo';
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database query error" });

    const products = results.map((row) => ({
      product_id: row.product_id,
      variant_id: row.variant_id,
      title: row.title,
      imageUrl: row.imageUrl,
      description: row.description,
      color: row.color,
      size: row.size,
      price: parseFloat(row.price),
      discount_percentage: parseFloat(row.discount_percentage) || 0,
      discountedPrice: Math.round(
        row.price - (row.price * (row.discount_percentage || 0)) / 100
      ),
    }));

    res.json(products);
  });
};

exports.getProductsBySearch = (req, res) => {
  const query = req.query.query;

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  const sql = `
    SELECT
      p.id AS product_id,
      p.title,
      p.description,
      p.imageUrl,
      v.id AS variant_id,
      v.color,
      v.size,
      v.price,
      v.available_quantity,
      IFNULL(d.discount_percentage, 0) AS discount_percentage
    FROM products p
    LEFT JOIN product_variants v ON p.id = v.product_id
    LEFT JOIN product_discounts d
      ON p.id = d.product_id
      AND NOW() BETWEEN d.start_date AND d.end_date
    WHERE p.title LIKE ?
       OR p.description LIKE ?
       OR v.color LIKE ?
       OR v.size LIKE ?
       OR v.price LIKE ?
    GROUP BY p.id, v.id
    ORDER BY p.id ASC
  `;

  const searchTerm = `%${query}%`;

  db.query(
    sql,
    [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });

      const productMap = {};

      results.forEach((row) => {
        if (!productMap[row.product_id]) {
          productMap[row.product_id] = {
            product_id: row.product_id,
            title: row.title,
            description: row.description,
            imageUrl: row.imageUrl,
            variants: [],
          };
        }

        if (row.variant_id) {
          productMap[row.product_id].variants.push({
            variant_id: row.variant_id,
            color: row.color,
            size: row.size,
            price: parseFloat(row.price),
            available_quantity: parseInt(row.available_quantity),
            discount_percentage: parseFloat(row.discount_percentage),
          });
        }
      });

      res.json(Object.values(productMap));
    }
  );
};

exports.createProduct = (req, res) => {
  const {
    title,
    description,
    imageUrl,
    is_trending,
    categoryIds,
    variants,
    discount,
  } = req.body;

  if (!title || !description || !imageUrl) {
    return res
      .status(400)
      .json({ error: "Title, description, and imageUrl are required" });
  }

  const productSql = `INSERT INTO products (title, description, imageUrl, is_trending) VALUES (?, ?, ?, ?)`;
  db.query(
    productSql,
    [title, description, imageUrl, is_trending || 0],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Failed to create product" });

      const productId = result.insertId;

      if (categoryIds && categoryIds.length) {
        const catValues = categoryIds.map((catId) => [productId, catId]);
        db.query(
          "INSERT INTO product_categories (product_id, category_id) VALUES ?",
          [catValues]
        );
      }

      if (variants && variants.length) {
        const variantValues = variants.map((v) => [
          productId,
          v.color,
          v.size,
          parseFloat(v.price) || 0,
          parseInt(v.quantity) || 0,
          parseInt(v.available_quantity) || 0,
        ]);
        db.query(
          "INSERT INTO product_variants (product_id, color, size, price, quantity, available_quantity) VALUES ?",
          [variantValues]
        );
      }

      if (discount) {
        const discountSql = `
          INSERT INTO product_discounts (product_id, discount_percentage, start_date, end_date)
          VALUES (?, ?, ?, ?)
        `;
        db.query(discountSql, [
          productId,
          parseFloat(discount.discount_percentage) || 0,
          discount.start_date || null,
          discount.end_date || null,
        ]);
      }

      return res.json({ message: "Product created successfully", productId });
    }
  );
};

exports.deleteProduct = (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM products WHERE id = ?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: "Delete failed" });
    res.json({ message: "Product deleted successfully" });
  });
};

exports.updateProduct = (req, res) => {
  const { id } = req.params;
  let {
    title,
    description,
    imageUrl,
    is_trending,
    categoryIds,
    variants,
    discount,
  } = req.body;

  variants = variants.map((v) => ({
    ...v,
    price: parseFloat(v.price) || 0,
    quantity: parseInt(v.quantity) || 0,
    available_quantity: parseInt(v.available_quantity) || 0,
  }));

  if (discount) {
    discount.discount_percentage =
      parseFloat(discount.discount_percentage) || 0;
  }

  db.query(
    `UPDATE products SET title=?, description=?, imageUrl=?, is_trending=? WHERE id=?`,
    [title, description, imageUrl, is_trending ? 1 : 0, id],
    (err) => {
      if (err)
        return res.status(500).json({ error: "Failed to update product" });

      if (categoryIds && categoryIds.length > 0) {
        db.query(
          "DELETE FROM product_categories WHERE product_id=?",
          [id],
          () => {
            const values = categoryIds.map((cid) => [id, cid]);
            if (values.length > 0) {
              db.query(
                "INSERT INTO product_categories (product_id, category_id) VALUES ?",
                [values]
              );
            }
          }
        );
      }

      if (variants && variants.length > 0) {
        variants.forEach((v) => {
          db.query(
            `SELECT id FROM product_variants WHERE product_id=? AND color=? AND size=?`,
            [id, v.color, v.size],
            (err, result) => {
              if (!err && result.length > 0) {
                const variantId = result[0].id;
                db.query(
                  `UPDATE product_variants SET price=?, quantity=?, available_quantity=? WHERE id=?`,
                  [v.price, v.quantity, v.available_quantity, variantId]
                );
              } else {
                db.query(
                  `INSERT INTO product_variants (product_id, color, size, price, quantity, available_quantity) VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    id,
                    v.color,
                    v.size,
                    v.price,
                    v.quantity,
                    v.available_quantity,
                  ]
                );
              }
            }
          );
        });
      }

      if (discount) {
        db.query(
          `SELECT id FROM product_discounts WHERE product_id=?`,
          [id],
          (err, result) => {
            if (!err && result.length > 0) {
              db.query(
                `UPDATE product_discounts SET discount_percentage=?, start_date=?, end_date=? WHERE product_id=?`,
                [
                  discount.discount_percentage,
                  discount.start_date,
                  discount.end_date,
                  id,
                ]
              );
            } else {
              db.query(
                `INSERT INTO product_discounts (product_id, discount_percentage, start_date, end_date) VALUES (?, ?, ?, ?)`,
                [
                  id,
                  discount.discount_percentage,
                  discount.start_date,
                  discount.end_date,
                ]
              );
            }
          }
        );
      }

      res.json({ message: "Product updated successfully" });
    }
  );
};

exports.getAllCategories = (req, res) => {
  const sql = `SELECT id, title FROM categories ORDER BY id ASC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};
