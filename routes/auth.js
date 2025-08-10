const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");

// Registration
router.post("/register", async (req, res) => {
  const { name, number, password } = req.body;

  if (!name || !number || !password) {
    return res.status(400).json({ message: "সব তথ্য দিতে হবে" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // secure hash
    const query = "INSERT INTO users (name, number, password) VALUES (?, ?, ?)";

    db.query(query, [name, number, hashedPassword], (err, result) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.status(201).json({ message: "✅ রেজিস্ট্রেশন সফল হয়েছে" });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", (req, res) => {
  const { number, password } = req.body;

  if (!number || !password) {
    return res.status(400).json({ message: "নাম্বার ও পাসওয়ার্ড দরকার" });
  }

  const query = "SELECT * FROM users WHERE number = ?";
  db.query(query, [number], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "ইউজার পাওয়া যায়নি" });
    }

    const user = results[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "পাসওয়ার্ড ভুল" });
    }

    // ✅ Login success
    res.status(200).json({
      message: "লগইন সফল",
      user: { id: user.id, name: user.name, number: user.number },
    });
  });
});

module.exports = router;
