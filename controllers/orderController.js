const db = require("../config/db");

exports.createOrder = (req, res) => {
  const {
    name,
    phone,
    address,
    delivery_area,
    delivery_charge,
    totalPrice,
    grandTotal,
    items,
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    console.error("Order failed: No items in order");
    return res.status(400).json({ error: "No items in the order" });
  }

  db.beginTransaction(async (err) => {
    if (err) {
      console.error("Transaction begin failed:", err);
      return res.status(500).json({ error: "Transaction error", details: err });
    }

    // 1️⃣ Insert into orders table
    const sqlOrder = `INSERT INTO orders (status, created_at) VALUES (?, NOW())`;
    db.query(sqlOrder, ["Pending"], async (err, orderResult) => {
      if (err) {
        console.error("Order insert failed:", err);
        return db.rollback(() =>
          res.status(500).json({ error: "Order insert failed", details: err })
        );
      }

      const orderId = orderResult.insertId;
      console.log("Order created with ID:", orderId);

      // 2️⃣ Insert into delivery_info
      const sqlDelivery = `
        INSERT INTO delivery_info 
        (order_id, name, phone, address, delivery_area, delivery_charge, totalPrice, grandTotal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(
        sqlDelivery,
        [
          orderId,
          name,
          phone,
          address,
          delivery_area,
          delivery_charge,
          totalPrice,
          grandTotal,
        ],
        (err) => {
          if (err) {
            console.error("Delivery info insert failed:", err);
            return db.rollback(() =>
              res
                .status(500)
                .json({ error: "Delivery info insert failed", details: err })
            );
          }
          console.log("Delivery info inserted for order:", orderId);

          // 3️⃣ Insert into order_items with automatic variantId lookup
          const itemValues = [];

          const processItems = async () => {
            for (const item of items) {
              await new Promise((resolve, reject) => {
                // Find variantId based on productId + size + color
                db.query(
                  `SELECT id FROM product_variants WHERE product_id=? AND size=? AND color=? LIMIT 1`,
                  [item.productId, item.size, item.color],
                  (err, results) => {
                    if (err) return reject(err);
                    if (!results.length)
                      return reject(
                        new Error(
                          `No variant found for product ${item.productId} with size ${item.size} and color ${item.color}`
                        )
                      );

                    const variantId = results[0].id;
                    itemValues.push([
                      orderId,
                      item.productId,
                      variantId,
                      item.quantity,
                      item.price,
                    ]);
                    resolve();
                  }
                );
              }).catch((err) => {
                return db.rollback(() =>
                  res.status(400).json({ error: err.message })
                );
              });
            }

            // Insert all items
            const sqlItems = `
              INSERT INTO order_items
              (order_id, product_id, variant_id, quantity, price_at_purchase)
              VALUES ?
            `;
            db.query(sqlItems, [itemValues], (err) => {
              if (err) {
                console.error("Order items insert failed:", err);
                return db.rollback(() =>
                  res
                    .status(500)
                    .json({ error: "Order items insert failed", details: err })
                );
              }
              console.log("Order items inserted for order:", orderId);

              // ✅ Commit transaction
              db.commit((err) => {
                if (err) {
                  console.error("Transaction commit failed:", err);
                  return db.rollback(() =>
                    res.status(500).json({
                      error: "Transaction commit failed",
                      details: err,
                    })
                  );
                }

                console.log(
                  "Transaction committed successfully for order:",
                  orderId
                );
                res.status(201).json({
                  message: "Order placed successfully!",
                  orderId,
                });
              });
            });
          };

          processItems();
        }
      );
    });
  });
};

// 📦 Get all orders for admin
exports.getAllOrders = (req, res) => {
  const sql = `
    SELECT
      o.id AS orderId,
      o.status,
      o.created_at,
      d.name,
      d.phone,
      d.address,
      d.delivery_area AS deliveryArea,
      d.delivery_charge,
      d.totalPrice,
      d.grandTotal,
      oi.product_id,
      oi.quantity,
      oi.price_at_purchase,
      p.title,
      v.color,
      v.size
    FROM orders o
    JOIN delivery_info d ON o.id = d.order_id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    JOIN product_variants v ON oi.variant_id = v.id
    ORDER BY o.id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Fetch all orders failed:", err);
      return res.status(500).json({ error: "Fetch error" });
    }

    // 🔄 Group flat rows into structured order objects
    const orders = {};
    rows.forEach((row) => {
      if (!orders[row.orderId]) {
        orders[row.orderId] = {
          orderId: row.orderId,
          status: row.status,
          createdAt: row.created_at,
          name: row.name,
          phone: row.phone,
          address: row.address,
          deliveryArea: row.deliveryArea,
          deliveryCharge: row.delivery_charge,
          totalPrice: row.totalPrice,
          grandTotal: row.grandTotal,
          items: [],
        };
      }

      orders[row.orderId].items.push({
        productId: row.product_id,
        title: row.title,
        quantity: row.quantity,
        price: row.price_at_purchase,
        color: row.color,
        size: row.size,
      });
    });

    res.json(Object.values(orders));
  });
};

exports.updateOrderStatus = (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  const updateStatusQuery = `UPDATE orders SET status = ? WHERE id = ?`;

  db.query(updateStatusQuery, [status, orderId], (err) => {
    if (err)
      return res.status(500).json({ error: "Failed to update order status" });

    // If status is changed to 'Shipped', update inventory
    if (status.toLowerCase() === "shipped") {
      const getItemsQuery = `
        SELECT product_id, variant_id, quantity 
        FROM order_items 
        WHERE order_id = ?
      `;

      db.query(getItemsQuery, [orderId], (err, items) => {
        if (err)
          return res.status(500).json({ error: "Failed to fetch order items" });

        // Update each variant's available_quantity
        const updateStockPromises = items.map((item) => {
          return new Promise((resolve, reject) => {
            const updateStockQuery = `
              UPDATE product_variants
              SET available_quantity = GREATEST(available_quantity - ?, 0)
              WHERE id = ?
            `;
            db.query(
              updateStockQuery,
              [item.quantity, item.variant_id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });

        Promise.all(updateStockPromises)
          .then(() => {
            res.json({
              message: "Order status updated and inventory adjusted",
            });
          })
          .catch((err) => {
            console.error(err);
            res.status(500).json({ error: "Inventory update failed" });
          });
      });
    } else {
      res.json({ message: "Order status updated" });
    }
  });
};
