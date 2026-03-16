const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "inmob-secret";

module.exports = function authenticate(req, _res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    const err = new Error("No autorizado");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    return next(err);
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    const err = new Error("Token inválido");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    next(err);
  }
};
