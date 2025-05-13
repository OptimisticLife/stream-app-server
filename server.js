const http = require("http");
const routeHandler = require("./routeHandler");

const server = http.createServer();

server.on("request", routeHandler);

server.listen(4647, "::", () => {
  console.log("Server is running on port 4647");
});
