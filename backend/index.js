const express = require("express");
require("dotenv").config();
const app = express();
const PORT = process.env.BACKEND_PORT;

app.get("/", (req, res) => {
  res.send("Hello, Express!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});