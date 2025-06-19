export async function finalizeDailyPlaytime(db) {
  try {
    const { rows } = await db.query(`
      SELECT uuid, session_start
      FROM users
      WHERE session_start IS NOT NULL
    `);

    const now = new Date();

    for (const user of rows) {
      const sessionStart = new Date(user.session_start);
      const sessionSeconds = Math.floor((now - sessionStart) / 1000);

      await db.query(
        `
        INSERT INTO daily_playtime (uuid, play_date, seconds_played)
        VALUES ($1, CURRENT_DATE - INTERVAL '1 day', $2)
        ON CONFLICT (uuid, play_date)
        DO UPDATE SET seconds_played = daily_playtime.seconds_played + EXCLUDED.seconds_played
      `,
        [user.uuid, sessionSeconds]
      );

      await db.query(
        `
        UPDATE users
        SET session_start = NOW()
        WHERE uuid = $1
      `,
        [user.uuid]
      );
    }

    console.log(`✅ Finalized playtime for ${rows.length} users @ 6 AM CET`);
  } catch (error) {
    console.error(`❌ Failed to finalize daily playtime:`, error);
  }
}
