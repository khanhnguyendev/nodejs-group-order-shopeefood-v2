const path = require("path"),
  express = require("express"),
  morgan = require("morgan"),
  fs = require("fs"),
  io = require("socket.io"),
  bodyParser = require("body-parser"),
  thoughtRoutes = require("./routes/thoughtRoutes"),
  cors = require("cors");

module.exports.init = () => {

  const CONNECTION = "CONNECTION";
  const DATA = "DATA";
  const DEBUG = "DEBUG";
  const SUCCESS = "200";
  const ERROR = "400";
  const AUTHORITY = "401";

  //initialize app
  const app = express();

  

  

  // //for production build
  // if (process.env.NODE_ENV === "production") {
  //   //Serve any static files
  //   app.use(express.static(path.join(__dirname, "../../client/build")));

  //   //Handle React routing, return all requests to React app
  //   app.get("*", function (req, res) {
  //     res.sendFile(path.join(__dirname, "../../client/build", "index.html"));
  //   });
  // }

  return app;
};
