import logger from "../../logger.js";

const allowedIpCogs = process.env.ALLOWED_IP_ADDRESS_COGS_AND_STEAM;
const allowedIpTechnica = process.env.ALLOWED_IP_ADDRESS_TECHNICA;
const allowedIpLocal = process.env.ALLOWED_IP_ADDRESS_LOCAL;

/**
 * Express middleware to verify the IP address of incoming requests.
 *
 * - In production: allows ALLOWED_IP_ADDRESS_COGS_AND_STEAM and ALLOWED_IP_ADDRESS_TECHNICA.
 * - In non-production: allows ALLOWED_IP_ADDRESS_COGS_AND_STEAM, ALLOWED_IP_ADDRESS_TECHNICA and ALLOWED_IP_ADDRESS_LOCAL.
 *
 * @param {import('express').Request} req - The incoming HTTP request.
 * @param {import('express').Response} res - The HTTP response object.
 * @param {Function} next - Function to call the next middleware.
 */
export default function verifyIP(req, res, next) {
  const rawIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const normalizedIp = (rawIp || "")
    .replace("::ffff:", "")
    .split(",")[0]
    .trim();

  const isProd = process.env.NODE_ENV === "production";
  const allowed = isProd
    ? [allowedIpCogs, allowedIpTechnica]
    : [allowedIpCogs, allowedIpTechnica, allowedIpLocal];

  if (allowed.includes(normalizedIp)) {
    return next();
  }

  logger.warn(`Blocked request from IP: ${normalizedIp}`);
  return res.status(403).json({ error: "Forbidden: Your IP is not allowed." });
}
