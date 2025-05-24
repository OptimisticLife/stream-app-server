const { retrieveJsonFilesFromS3 } = require("../utils/awsHandler.js");
const { bodyParser } = require("../utils");
const { getSessionInstance } = require("../utils");
const { createToken } = require("./../utils/jwtHandler.js");

function loginRoute(req, res) {
  bodyParser(req)
    .then(async (data) => {
      const userData = JSON.parse(data);

      console.log("User data:", userData);

      const sessionInst = await getSessionInstance();
      const users = await retrieveJsonFilesFromS3("users");

      // Check if the user exists
      const user = users.find(
        (user) =>
          String(user.email).toLowerCase() ===
            String(userData.userName).toLowerCase() ||
          String(user.userName).toLowerCase() ===
            String(userData.userName).toLowerCase()
      );
      if (user) {
        // Check if the password is correct
        if (user.password !== userData.password) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.statusMessage = "Invalid password";
          res.end(JSON.stringify({ message: "Invalid password" }));
          return;
        }

        // New JWT token generation
        const token = createToken(user);
        const sessionID =
          "SESSION_ID_" + Math.random().toString(36).substring(2);

        // Check if the session already exists
        const existingSession = sessionInst.findSession(user.userId);
        if (existingSession) {
          // Update the existing session
          await sessionInst.updateSession(user.userId, token, sessionID);
        } else {
          // Create a new session
          await sessionInst.addSession(user.userId, token, sessionID);
        } // 2 minutes in milliseconds

        const tokenCookie = `token=${token}; SameSite=None; Path=/; Secure; HttpOnly`;

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Set-Cookie": [tokenCookie],
        });

        res.statusMessage = "SUCCESS";
        res.end(
          JSON.stringify({
            message: "Login successful",
            "auth-token": token,
            userName: user.userName,
          })
        );
      } else {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.statusMessage = "No user found";
        res.end(JSON.stringify({ message: "No user found" }));
      }
    })
    .catch((error) => {
      console.error("Error parsing request body:", error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    });
}

module.exports = loginRoute;
