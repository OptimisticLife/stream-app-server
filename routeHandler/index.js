const { headerConfig, sendJson, isAuthenticated } = require("../utils");
const registerRoute = require("./register");
const loginRoute = require("./login");
const logout = require("./logout");
const {
  streamFileFromS3,
  uploadFileToS3,
  retrieveJsonFilesFromS3,
} = require("./../utils/awsHandler");

// Route definitions (non-stream routes)
const routes = {
  "GET /": (req, res) =>
    sendJson(res, 200, { message: "Welcome to the Movie Upload API" }),

  "POST /login": loginRoute,

  "POST /register": registerRoute,

  "POST /logout": (req, res) => {
    isAuthenticated(req, res, function () {
      return logout(req, res);
    });
  },

  "GET /check-session": (req, res) => {
    isAuthenticated(req, res, function () {
      return sendJson(res, 200, {
        message: "Authorized",
      });
    });
  },

  "GET /getMovies": (req, res) => {
    isAuthenticated(req, res, async function () {
      const movies = await retrieveJsonFilesFromS3("movies");
      const movieMetaData = movies.map(({ id, name }) => ({ id, name }));
      sendJson(res, 200, movieMetaData);
    });
  },

  "POST /upload-thumbnail-chunk": (req, res) => uploadFileToS3(req, res, false),

  "POST /upload-movie-chunk": (req, res) => uploadFileToS3(req, res, true),
};

// Normalize URL (e.g. remove "/api")
function normalizeUrl(url) {
  return url.includes("/api") ? url.replace("/api", "") : url;
}

function routeHandler(req, res) {
  req.url = normalizeUrl(req.url);

  // CORS setup
  const origin = req.headers.origin;
  if (
    origin?.includes("localhost:5173") ||
    origin?.includes("stream-app-ui.onrender")
  ) {
    res.setHeaders(
      new Headers({ ...headerConfig, "Access-Control-Allow-Origin": origin })
    );
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, headerConfig);
    return res.end();
  }

  const routeKey = `${req.method} ${req.url.split("?")[0]}`;
  const route = routes[routeKey];

  // Movie thumbnails (JPEG)
  if (req.method === "GET" && req.url.endsWith(".jpeg")) {
    return isAuthenticated(req, res, function () {
      streamFileFromS3(req, res, false);
    });
  }

  // Movie videos (MP4)
  if (req.method === "GET" && req.url.endsWith(".mp4")) {
    return isAuthenticated(req, res, function () {
      streamFileFromS3(req, res, true);
    });
  }

  if (route) {
    return route(req, res);
  }

  // Fallback for 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 Not Found");
}

module.exports = routeHandler;
