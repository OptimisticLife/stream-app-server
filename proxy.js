const http = require("http");
const { headerConfig } = require("./utils");

const proxyServer = http.createServer();
const port = 4647;

proxyServer.on("request", (req, res) => {
  const clientRequest = http.request({
    url: `http://localhost:4647${req.url}`,
    method: req.method,
    headers: req.headers,
  });

  clientRequest.on("response", (response) => {
    res.writeHead(response.statusCode, headerConfig);
    response.pipe(res, { end: true });
  });
  req.pipe(clientRequest, { end: true });
  req.on("error", (err) => {
    console.error("Error with request:", err);
    res.writeHead(500, headerConfig);
    res.end("Internal Server Error");
  });
});

proxyServer.on("error", (err) => {
  console.error("Error with server:", err);
});
proxyServer.listen(port, () => {
  console.log(`Proxy server is running on port ${port}`);
});
