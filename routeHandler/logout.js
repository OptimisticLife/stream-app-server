const { getSessionInstance } = require("./../utils");

async function logout(req, res) {
  // Check if the request method is POST

  const sessionInst = await getSessionInstance();

  const token = req.headers["cookie"].split("=")[1];
  await sessionInst.removeSession(token);

  // Clear the session cookie
  res.writeHead(200, {
    "Set-Cookie": "token=; HttpOnly; Max-Age=0; Path=/",
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify({ message: "Logged out successfully" }));
}

module.exports = logout;
