const fs = require("fs");
const users = require("../storage/users.json");
const session = require("../storage/session.json");
const { bodyParser } = require("../utils");

function loginRoute(req, res) {
  bodyParser(req)
    .then((data) => {
      const userData = JSON.parse(data);
      const user = users.find(
        (user) =>
          user.email === userData.email || user.userName === userData.userName
      );
      if (user) {
        // New token generation
        const token = Math.random().toString(36).substring(2);
        const sessionID =
          "SESSION_ID_" + Math.random().toString(36).substring(2);

        session.push({ user: user.userId, token, sessionID });
        fs.writeFileSync("./storage/session.json", JSON.stringify(session));

        const cookie = `token=${token}; SameSite=None; HttpOnly; Path=/;`;

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
        res.statusMessage = "Unauthorized";
        res.end(JSON.stringify({ message: "Invalid credentials" }));
      }
    })
    .catch((error) => {
      console.error("Error parsing request body:", error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    });
}

module.exports = loginRoute;
