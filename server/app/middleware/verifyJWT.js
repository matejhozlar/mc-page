import jwt from "jsonwebtoken";

/**
 * Express middleware to verify JWT tokens from the Authorization header.
 *
 * - Expects `Authorization: Bearer <token>` format.
 * - Verifies the token using `process.env.JWT_SECRET`.
 * - Attaches the decoded payload to `req.user` if valid.
 *
 * @param {import('express').Request} req - The incoming HTTP request object.
 * @param {import('express').Response} res - The HTTP response object.
 * @param {Function} next - Function to pass control to the next middleware.
 */
export default function verifyJWT(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Invalid Authorization format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}
