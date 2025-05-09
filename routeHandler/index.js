const headerConfig = require("../utils").headerConfig;
const movies = require("../storage/movies.json");
const { sendImage, sendJson, sendVideo, isAuthenticated } = require("../utils");

const registerRoute = require("./register");
const loginRoute = require("./login");
const logout = require("./logout");
const {
  movieChunk,
  thumbnailChunk,
  movieUpload,
  movieUploadConfirmation,
} = require("./uploadMovie");

function routeHandler(req, res) {
  console.log("Incoming URL:", req.url);

  if (req.url.includes("/api")) {
    req.url = req.url.replace("/api", "");
  }

  console.log("URL after /api removal URL:", req.url);

  const origin = req.headers.origin;

  if (
    origin?.includes("localhost:5173") ||
    origin?.includes("stream-app-ui.onrender")
  ) {
    console.log("CORS headers set for origin:", origin);
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

  // ROUTE FOR HOME PAGE
  if (req.url === "/" && req.method === "GET") {
    res.writeHead(200, headerConfig);
    res.end("Welcome to the Movie Upload API");
    return;
  }

  // CHECKING FOR AUTHENTICATION
  if (req.url !== "/login" && req.url !== "/register") {
    console.log("Checking authentication for URL:", req.url);
    if (req.url === "/check-session" && req.method === "GET") {
      if (!isAuthenticated(req)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Unauthorized" }));
        return;
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Authorized" }));
        return;
      }
    } else {
      if (!isAuthenticated(req)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Unauthorized" }));
        return;
      }
    }
  }

  //   ROUTE FOR LOGIN USER

  if (req.url === "/login" && req.method === "POST") {
    loginRoute(req, res);
  }

  //   ROUTE FOR REGISTER USER
  else if (req.url === "/register" && req.method === "POST") {
    registerRoute(req, res);
  }

  //   ROUTE FOR LOGOUT USER
  else if (req.url === "/logout" && req.method === "POST") {
    logout(req, res);
  }

  //  ROUTE FOR GETTING MOVIE LIST
  else if (req.url === "/getMovies" && req.method === "GET") {
    sendJson(res, 200, movies);
  }

  //  ROUTE FOR NEW MOVIE UPLOAD
  else if (req.url === "/upload-movie" && req.method === "POST") {
    movieUpload(req, res);
  }

  //  ROUTE FOR THUMBNAIL CHUNK UPLOAD
  else if (req.url === "/upload-thumbnail-chunk" && req.method === "POST") {
    thumbnailChunk(req, res);
  }

  //  ROUTE FOR MOVIE CHUNK UPLOAD
  else if (req.url === "/upload-movie-chunk" && req.method === "POST") {
    movieChunk(req, res);
  }

  //  ROUTE FOR MOVIE UPLOAD CONFIRMATION
  else if (
    req.url === "/movie-uploaded-confirmation" &&
    req.method === "POST"
  ) {
    movieUploadConfirmation(req, res);
  }

  //   ROUTE FOR MOVIE IMAGE
  else if (req.url.includes(".jpeg") && req.method === "GET") {
    const filePath = `./storage/movieImg/${req.url.split("/").pop()}`;
    sendImage(res, 200, filePath);
  }

  //   ROUTE FOR MOVIE .mp4 FILES
  else if (req.url.includes(".mp4") && req.method === "GET") {
    const filePath = `./storage/movievideo/${req.url.split("/").pop()}`;
    sendVideo(req, res, 200, filePath);
  }

  //  ROUTE FOR INAPPROPRIATE URL
  else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  }
}

module.exports = routeHandler;
