// Create JWT
const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

function createToken(user) {
  return jwt.sign(
    {
      sub: user.userId,
      email: user.email,
    },
    SECRET,
    { expiresIn: "1h" }
  );
}

// Verify JWT (middleware example)
function verifyToken(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return false; // no token, unauthorized
  }

  // Parse cookie string to find token (assuming token stored as "token=...")
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {});

  const token = cookies.token; // Adjust 'token' if you named it differently
  if (!token) {
    return false;
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // user info from token
    return true; // Token is valid
  } catch (err) {
    return false;
  }
}

module.exports = { createToken, verifyToken };
