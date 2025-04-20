const headerConfig = require("../utils").headerConfig;
const movies = require("../storage/movies.json");
const { sendImage, sendJson, sendVideo } = require("../utils");

const registerRoute = require("./register");
const loginRoute = require("./login");

function routeHandler(req, res) {
  const origin = req.headers.origin;
  if (origin?.includes("localhost:5173")) {
    headerConfig["Access-Control-Allow-Origin"] = origin;
    const corsHeaders = new Headers({ ...headerConfig });
    res.setHeaders(corsHeaders);
  }

  //   CORS preflight request
  if (req.method === "OPTIONS") {
    res.writeHead(200, headerConfig);
    res.end();
    return;
  }

  if (req.url === "/getMovies" && req.method === "GET") {
    sendJson(res, 200, movies);
  }

  //   ROUTE FOR REGISTER USER
  else if (req.url === "/register" && req.method === "POST") {
    registerRoute(req, res);
  }

  //   ROUTE FOR LOGIN USER
  else if (req.url === "/login" && req.method === "POST") {
    loginRoute(req, res);
  }
  //   ROUTE FOR MOVIE IMAGE
  else if (req.url.includes(".jpeg") && req.method === "GET") {
    const filePath = `./storage/movieImg/${req.url.split("/").pop()}`;
    sendImage(res, 200, filePath);

    //   ROUTE FOR MOVIE .mp4 FILES
  } else if (req.url.includes(".mp4") && req.method === "GET") {
    const filePath = `./storage/movievideo/${req.url.split("/").pop()}`;
    sendVideo(req, res, 200, filePath);

    //  ROUTE FOR INAPPROPRIATE URL
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  }
}

module.exports = routeHandler;
