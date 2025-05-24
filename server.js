// 🔐 Add these FIRST — before any require/imports
process.on("uncaughtException", (err) => {
  console.log("🔥 Uncaught Exception:", err);
  // Optionally exit: process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.log("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
  // Optionally exit: process.exit(1);
});

const http = require("http");
const routeHandler = require("./routeHandler");

const server = http.createServer();

server.on("request", routeHandler);

server.listen(4647, "::", () => {
  console.log("Server is running on port 4647");
});
