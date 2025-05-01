const users = require("../storage/users.json");
const { bodyParser } = require("../utils");
const { Session } = require("./../utils");

function loginRoute(req, res) {
  bodyParser(req)
    .then((data) => {
      const userData = JSON.parse(data);

      // Check if the user exists
      const user = users.find(
        (user) =>
          user.email === userData.email || user.userName === userData.userName
      );
      if (user) {
        // Check if the password is correct
        if (user.password !== userData.password) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.statusMessage = "Invalid password";
          res.end(JSON.stringify({ message: "Invalid password" }));
          return;
        }

        // New token generation
        const token = Math.random().toString(36).substring(2);
        const sessionID =
          "SESSION_ID_" + Math.random().toString(36).substring(2);

        // Check if the session already exists
        const existingSession = Session.findSession(user.userId);
        if (existingSession) {
          // Update the existing session
          Session.updateSession(user.userId, token, sessionID);
        } else {
          // Create a new session
          Session.addSession(user.userId, token, sessionID);
        }

        const now = new Date();
        now.setTime(now.getTime() + 2 * 60 * 1000); // 2 minutes in milliseconds

        const cookie = `token=${token}; SameSite=None; expires=${now.toUTCString()}; Path=/; Secure`;

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Set-Cookie": cookie,
        });

        res.statusMessage = "SUCCESS";
        res.end(
          JSON.stringify({ message: "Login successful", "auth-token": token })
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
