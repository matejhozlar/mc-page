export default function verifyApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!key || key !== process.env.CURRENCY_API_KEY) {
    return res.status(403).json({ error: "Forbidden access" });
  }
  next();
}
