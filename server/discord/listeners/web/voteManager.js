// Import RCON command sender for Minecraft server interaction
import { sendRconCommand } from "../../../utils/rcon/sendRconCommand.js";

// Shared vote state object, tracks whether a vote is active, counts, cooldowns, etc.
import { voteState } from "./votes/voteState.js";

// Prevents this logic from running in non-production environments (e.g., local dev)
import { exitIfNotProduction } from "../../../utils/production/onlyInProduction.js";

import logger from "../../../logger.js";

// ======= Constants =======

// Time voting is open: 30 seconds (30,000 ms)
const VOTE_DURATION_MS = 30_000;

// Cooldown duration after successful vote: ~9 minutes 37 seconds
const COOLDOWN_SUCCESS_MS = 577_100;

// Cooldown after failed vote: 3 minutes
const COOLDOWN_FAIL_MS = 3 * 60_000;

/**
 * Starts a vote for a given command.
 *
 * @param {string} commandKey - A unique identifier for the vote type (e.g., "skipnight").
 * @param {Object} voteDetails - Details about the vote.
 * @param {string} voteDetails.description - What the vote is about (used in message).
 * @param {string} voteDetails.command - RCON command to run if the vote passes.
 * @param {TextChannel} messageChannel - Discord text channel to send messages to.
 * @param {SocketIO.Server} io - WebSocket server for broadcasting messages to frontend clients.
 * @returns {boolean} - Whether the vote was successfully started.
 */
export function startVote(commandKey, voteDetails, messageChannel, io) {
  // Ensure we're in production. If not, exit.
  if (!exitIfNotProduction()) return;

  // Block starting a new vote if one is already active
  if (voteState.active) return false;

  // Sanity check for missing params
  if (!commandKey || !voteDetails) {
    logger.warn(`Invalid vote command used: ${commandKey}`);
    return false;
  }

  // Check if we're still within cooldown period from previous vote
  if (voteState.cooldownUntil > Date.now()) {
    return false;
  }

  // ======= Begin Vote =======

  voteState.active = true;
  voteState.counts = { yes: 0, no: 0 };
  voteState.voters.clear(); // Reset who has voted

  const voteMsg =
    `📢 **Vote to ${voteDetails.description} started!**\n` +
    `Reply with \`1\` for **yes**, \`2\` for **no**.\n` +
    `Voting ends in ${VOTE_DURATION_MS / 1000} seconds...`;

  // Send vote message to Discord
  messageChannel.send(voteMsg).catch(logger.error);

  // Broadcast to connected frontend clients
  io.emit("chatMessage", { text: voteMsg, authorType: "web" });

  // Set a timeout to resolve the vote after voting window closes
  voteState.timeout = setTimeout(() => {
    (async () => {
      const { yes, no } = voteState.counts;
      let resultMsg = "";

      // Determine cooldown based on result
      const cooldown = no > yes ? COOLDOWN_FAIL_MS : COOLDOWN_SUCCESS_MS;

      try {
        // ======= Vote Resolution Logic =======

        if (yes > no) {
          // Vote passed — run RCON command
          resultMsg = `✅ Vote passed! Executing: ${voteDetails.command}`;
          await sendRconCommand(voteDetails.command);
        } else if (yes === no) {
          resultMsg = "It's a tie. Nothing changes.";
        } else {
          resultMsg = "❌ Vote failed.";
        }

        const finalMsg = `📊 Vote Results\nYes: ${yes} | No: ${no}\n${resultMsg}`;

        // Send results to Discord and web clients
        messageChannel.send(finalMsg).catch(logger.error);
        io.emit("chatMessage", { text: finalMsg, authorType: "web" });
      } catch (err) {
        logger.error(`❌ Error during vote resolution: ${err}`);
      } finally {
        // Reset state and start cooldown
        voteState.active = false;
        voteState.cooldownUntil = Date.now() + cooldown;
      }
    })();
  }, VOTE_DURATION_MS); // 30-second vote window

  return true;
}
