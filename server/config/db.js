export default {
  /**
   * How long a client is allowed to remain idle (not actively using the connection)
   * before being closed by the pool.
   *
   * Default: 30,000 ms (30 seconds)
   * Useful for cleaning up unused connections in low-traffic periods.
   */
  IDLE_TIMEOUT_MS: 30_000,

  /**
   * How long to wait when establishing a new connection before timing out.
   *
   * Default: 10,000 ms (10 seconds)
   * Prevents hanging if the database is unreachable or slow to respond.
   */
  CONNECTION_TIMEOUT_MS: 10_000,
};
