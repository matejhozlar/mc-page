import logger from "../../logger.js";

const allowedIp = process.env.ALLOWED_IP_ADDRESS;
const allowedIpLocal = process.env.ALLOWED_IP_ADDRESS_LOCAL;

export default function verifyIP(req, res, next) {
  const rawIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const normalizedIp = (rawIp || "")
    .replace("::ffff:", "")
    .split(",")[0]
    .trim();

  if (normalizedIp === allowedIp || normalizedIp === allowedIpLocal) {
    return next();
  }

  logger.warn(`Blocked request from IP: ${normalizedIp}`);
  return res.status(403).json({ error: "Forbidden: Your IP is not allowed." });
}
