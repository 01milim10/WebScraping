const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);
app.use(bodyParser.json());

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
require("./scrap2.js");

app.get("/", (req, res) => {
  res.status(200).json({ message: "Success" });
});
