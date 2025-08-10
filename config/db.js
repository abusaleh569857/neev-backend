// const mysql = require("mysql2");
// const dotenv = require("dotenv");
// dotenv.config();

// const db = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
// });

// db.connect((err) => {
//   if (err) {
//     console.error("Database connection failed:", err);
//   } else {
//     console.log("Connected to MySQL Database");
//   }
// });

// module.exports = db;

const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, // This is the target database name
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
    return;
  }

  // Check if the specified database exists
  db.query(`USE ${process.env.DB_NAME};`, (useErr) => {
    if (useErr) {
      console.error(
        `Database ${process.env.DB_NAME} does not exist:`,
        useErr.message
      );
    } else {
      console.log(`Successfully connected to database ${process.env.DB_NAME}`);
    }
  });
});

module.exports = db;
