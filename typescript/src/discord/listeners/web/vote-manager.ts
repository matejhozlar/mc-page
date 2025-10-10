import type {
  TextChannel,
  NewsChannel,
  ThreadChannel,
  GuildTextBasedChannel,
} from "discord.js";
import type { Server as SocketIOServer } from "socket.io";
import { sendRconCommand } from "../../../utils/rcon/send-rcon-command";
import { voteState } from "./votes/vote-state";
import { exitIfNotProduction } from "../../../utils/production/env-guard";
import logger from "../../../logger";

const VOTE_DURATION_MS = 30_000;
const COOLDOWN_SUCCESS_MS = 577_100;
const COOLDOWN_FAIL_MS = 3 * 60_000;

export interface VoteDetails {
  description: string;
  command: string;
}

type SendableChannel = (TextChannel | NewsChannel | ThreadChannel) &
  GuildTextBasedChannel;

function canSend(ch: unknown): ch is SendableChannel {
  return !!ch && typeof (ch as any).send === "function";
}

/**
 * Starts a vote for a given command.
 *
 * @param commandKey  Unique identifier for the vote type (e.g., "skipnight").
 * @param voteDetails Details about the vote (description + RCON command).
 * @param messageChannel Discord text-based channel to post updates.
 * @param io Socket.IO server to broadcast updates to web clients.
 * @returns Whether the vote was successfully started.
 */
export function startVote(
  commandKey: string,
  voteDetails: VoteDetails,
  messageChannel: GuildTextBasedChannel,
  io: SocketIOServer
): boolean {
  if (!exitIfNotProduction()) return false;
  if (voteState.active) return false;

  if (!commandKey || !voteDetails?.description || !voteDetails?.command) {
    logger.warn(`Invalid vote command used: ${commandKey}`);
    return false;
  }

  if (voteState.cooldownUntil > Date.now()) {
    return false;
  }

  voteState.active = true;
  voteState.counts = { yes: 0, no: 0 };
  voteState.voters.clear();

  const voteMsg =
    `📢 **Vote to ${voteDetails.description} started!**\n` +
    `Reply with \`1\` for **yes**, \`2\` for **no**.\n` +
    `Voting ends in ${VOTE_DURATION_MS / 1000} seconds...`;

  if (canSend(messageChannel)) {
    messageChannel
      .send(voteMsg)
      .catch((e) => logger.error(`send voteMsg failed: ${String(e)}`));
  }

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

        if (canSend(messageChannel)) {
          messageChannel
            .send(finalMsg)
            .catch((e) => logger.error(`send finalMsg failed: ${String(e)}`));
        }
        io.emit("chatMessage", { text: finalMsg, authorType: "web" });
      } catch (err) {
        logger.error(
          `Error during vote resolution: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        voteState.active = false;
        voteState.cooldownUntil = Date.now() + cooldown;
      }
    })();
  }, VOTE_DURATION_MS);

  return true;
}

export default startVote;
