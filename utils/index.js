let {
  uploadingJsonFilestoS3,
  retrieveJsonFilesFromS3,
} = require("../utils/awsHandler.js");
const { verifyToken } = require("./jwtHandler.js");

const headerConfig = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "range, Content-Type, x-file-id, x-is-last",
  "Access-Control-Expose-Headers": "token",
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

const isAuthenticated = (req, res, successCallback) => {
  const isAuth = verifyToken(req);
  if (!isAuth) {
    res.writeHead(401, "Content-type", "application/json");
    res.end(JSON.stringify({ message: "Unauthorized" }));
    return;
  }
  successCallback();
};

class Session {
  constructor() {
    this.sessions = [];
  }

  async init() {
    await this.retriveSession();
    return this;
  }

  findSession(userId) {
    if (this.sessions.length === 0) return false;
    return this.sessions.find((session) => session.userId === userId);
  }

  async addSession(userId, token, sessionID) {
    this.sessions.push({ userId, token, sessionID });
    await this.writeSession();
  }

  async removeSession(token) {
    this.sessions = this.sessions.filter((session) => session.token !== token);
    return await this.writeSession();
  }

  async retriveSession() {
    this.sessions = await retrieveJsonFilesFromS3("session");
  }

  async writeSession() {
    return await uploadingJsonFilestoS3("session", this.sessions);
  }

  async updateSession(userId, token, sessionID) {
    this.sessions.forEach((s) => {
      if (s.userId === userId) {
        s.token = token;
        s.sessionID = sessionID;
      }
    });
    return await this.writeSession();
  }
}

// Singleton holder
let instancePromise = null;

function getSessionInstance() {
  if (!instancePromise) {
    const session = new Session();
    instancePromise = session.init(); // This will be reused and resolved once
  }
  return instancePromise; // Always returns a Promise that resolves to the singleton
}

module.exports = {
  sendJson,
  headerConfig,
  bodyParser,
  isAuthenticated,
  getSessionInstance,
};
