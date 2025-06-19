export async function cleanupDailyPlaytime(db) {
  try {
    await db.query(`DELETE FROM daily_playtime`);
    console.log("🗑️ Cleared daily_playtime table @ 6:30 AM CET");
  } catch (error) {
    console.error("❌ Failed to clear daily_playtime table:", error);
  }
}
