import logger from "../../logger.js";

/**
 * Creates visit tracking middleware and DB sync interval.
 * @param {import('pg').Pool} db - PostgreSQL connection
 * @returns {import('express').RequestHandler}
 */
export function createVisitTracker(db) {
  let visitCounter = 0;
  let currentDay = new Date().toISOString().slice(0, 10);

  const middleware = (req, res, next) => {
    if (req.method === "GET" && req.accepts("html")) {
      const cookie = req.headers.cookie || "";
      const alreadyVisited = cookie.includes("visited=true");

      if (!alreadyVisited) {
        const today = new Date().toISOString().slice(0, 10);
        if (today !== currentDay) {
          visitCounter = 0;
          currentDay = today;
        }
        visitCounter++;

        res.setHeader(
          "Set-Cookie",
          "visited=true; Max-Age=900; Path=/; HttpOnly"
        );
      }
    }
    next();
  };

  setInterval(async () => {
    if (visitCounter > 0) {
      try {
        await db.query(
          `
          INSERT INTO visits (date, count)
          VALUES ($1, $2)
          ON CONFLICT (date)
          DO UPDATE SET count = visits.count + $2
        `,
          [currentDay, visitCounter]
        );
        logger.info(`📝 Synced ${visitCounter} visits to DB.`);
        visitCounter = 0;
      } catch (err) {
        logger.error(`❌ Failed to sync visits: ${err.message}`);
      }
    }
  }, 60 * 1000);

  return middleware;
}
