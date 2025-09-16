export default {
  /**
   * Number of days of inactivity before a user is considered "stale".
   * Any user whose last_seen timestamp is older than this threshold
   * (and is not null) will be included in the inactive user list.
   */
  INACTIVITY_DAYS: 30,

  /**
   * Number of days inactive users are given to reply after being tagged.
   * A countdown timer will be shown in the embed, so they know how long
   * they have left to respond before further action is taken.
   */
  REPLY_DAYS: 14,

  /**
   * Blacklisted users who should never be flagged as inactive,
   * even if they meet the inactivity criteria.
   *
   * You can blacklist users either by their Discord **user ID** (preferred)
   * or by their username. IDs are more reliable since usernames can change.
   */
  BLACKLIST: [
    "818819241666281503",
    "547450242090532874",
    "1259021182485925949",
    "389456401715560452",
    "383933267021266957",
  ],

  /**
   * If true, the bot will shut down immediately after the first
   * Accept or Decline action is taken on any review message.
   * If false, it will wait until all review messages are handled.
   */
  STOP_ON_FIRST_ACTION: true,

  /**
   * Maximum number of minutes the bot should stay alive waiting for
   * Accept/Decline interactions. After this time, the bot will auto-shutdown
   * even if there are still pending review messages.
   *
   * Set to 0 to disable automatic shutdown by timer.
   */
  AUTO_SHUTDOWN_MINUTES: 0,
};
