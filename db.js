db.js --  // db.js
const mysql = require("mysql2");

// Create a connection pool
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // ✅ matches .env
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Export the pool
module.exports = { pool };
