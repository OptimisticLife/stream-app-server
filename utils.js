const fsAsync = require("fs/promises");
const fs = require("fs");

const headerConfig = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "range, Content-Type,",
  "Access-Control-Expose-Headers": "*",
};

const bodyParser = (req) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  return new Promise((resolve, reject) => {
    req.on("end", () => {
      resolve(body);
    });
  });
};

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(data));
};

const sendVideo = async (req, res, statusCode, filePath) => {
  try {
    const stats = await fsAsync.stat(filePath);

    //Handling range request...
    const range = req.headers?.range;

    let start = 0;
    let end = stats.size - 1;

    if (range) {
      const rangeValue = range.split("=")[1];
      const ranges = rangeValue.split("-");
      start = Number(ranges[0]);
      end = Number(ranges[1]) || stats.size - 1;

      if (start >= stats.size || end >= stats.size) {
        res.writeHead(416, {
          "Content-Range": `bytes */${stats.size}`,
        });
        res.end();
        return;
      }
    }

    const readStream = fs.createReadStream(filePath, {
      start: start,
      end: end,
    });

    res.writeHead(206, {
      "Content-Type": "video/mp4",
      "Content-Length": end - start + 1,
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${stats.size}`,
    });

    readStream.pipe(res);
  } catch (err) {
    console.log("Error in streaming video: ", err);
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Error in streaming..");
  }
};

const sendImage = (res, statusCode, filePath) => {
  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Image not found");
      return;
    }
    res.writeHead(statusCode, {
      "Content-Type": "image/jpeg",
      "Content-Length": stats.size,
    });
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
};

module.exports = { sendJson, sendVideo, sendImage, headerConfig, bodyParser };
