import { sendRconCommand } from "../../../utils/rcon/sendRconCommand.js";
import { voteState } from "./votes/voteState.js";
import { exitIfNotProduction } from "../../../utils/production/onlyInProduction.js";
import logger from "../../../logger.js";

const VOTE_DURATION_MS = 30_000;
const COOLDOWN_SUCCESS_MS = 577_100;
const COOLDOWN_FAIL_MS = 3 * 60_000;

export function startVote(commandKey, voteDetails, messageChannel, io) {
  if (!exitIfNotProduction()) return;
  if (voteState.active) return false;

  if (!commandKey || !voteDetails) {
    logger.warn(`Invalid vote command used: ${commandKey}`);
    return false;
  }

  if (voteState.cooldownUntil > Date.now()) {
    return false;
  }

  voteState.active = true;
  voteState.counts = { yes: 0, no: 0 };
  voteState.voters.clear();

  const voteMsg = `📢 **Vote to ${
    voteDetails.description
  } started!**\nReply with \`1\` for **yes**, \`2\` for **no**.\nVoting ends in ${
    VOTE_DURATION_MS / 1000
  } seconds...`;
  messageChannel.send(voteMsg).catch(logger.error);
  io.emit("chatMessage", { text: voteMsg, authorType: "web" });

  voteState.timeout = setTimeout(() => {
    (async () => {
      const { yes, no } = voteState.counts;
      let resultMsg = "";
      const cooldown = no > yes ? COOLDOWN_FAIL_MS : COOLDOWN_SUCCESS_MS;

      try {
        if (yes > no) {
          resultMsg = `✅ Vote passed! Executing: ${voteDetails.command}`;
          await sendRconCommand(voteDetails.command);
        } else if (yes === no) {
          resultMsg = "It's a tie. Nothing changes.";
        } else {
          resultMsg = "❌ Vote failed.";
        }

        const finalMsg = `📊 Vote Results\nYes: ${yes} | No: ${no}\n${resultMsg}`;
        messageChannel.send(finalMsg).catch(logger.error);
        io.emit("chatMessage", { text: finalMsg, authorType: "web" });
      } catch (err) {
        logger.error(`❌ Error during vote resolution: ${err}`);
      } finally {
        voteState.active = false;
        voteState.cooldownUntil = Date.now() + cooldown;
      }
    })();
  }, VOTE_DURATION_MS);

  return true;
}
