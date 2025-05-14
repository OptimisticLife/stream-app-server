const fs = require("fs");
const { bodyParser } = require("../utils");
const {
  retrieveJsonFilesFromS3,
  uploadingJsonFilestoS3,
} = require("../awsHandler");

const registerRoute = (req, res) => {
  bodyParser(req)
    .then(async (data) => {
      const userData = JSON.parse(data);
      const users = await retrieveJsonFilesFromS3("users");
      // Check if user already exists
      const existingUser = users.find(
        (user) =>
          user.email === userData.email || user.userName === userData.userName
      );
      if (existingUser) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.statusMessage = "Conflict";
        return res.end(JSON.stringify({ message: "User already exists" }));
      }

      // New user registration
      const userId = "USER_" + Math.random().toString(36).substring(2);
      userData.userId = userId;
      users.push(userData);
      await uploadingJsonFilestoS3("users", users);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.statusMessage = "SUCCESS";
      res.end(JSON.stringify({ message: "User registered successfully" }));
    })
    .catch((error) => {
      console.error("Error parsing request body:", error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    });
};

module.exports = registerRoute;
