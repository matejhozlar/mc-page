import type { Interaction } from "discord.js";

import createTicket from "./create";
import startCloseTicket from "./start-close";
import confirmCloseTicket from "./confirm-close";
import cancelCloseTicket from "./cancel-close";
import reopenTicket from "./reopen";
import deleteTicket from "./delete";
import transcriptTicket from "./transcript";

export type TicketAction =
  | "create_ticket"
  | "start_close_ticket"
  | "confirm_close_ticket"
  | "cancel_close_ticket"
  | "reopen_ticket"
  | "delete_ticket"
  | "ticket_transcript";

export type TicketHandler = (
  interaction: Interaction,
  ...args: any[]
) => Promise<void>;

export const ticketHandlers: Map<TicketAction, TicketHandler> = new Map([
  ["create_ticket", createTicket as TicketHandler],
  ["start_close_ticket", startCloseTicket as TicketHandler],
  ["confirm_close_ticket", confirmCloseTicket as TicketHandler],
  ["cancel_close_ticket", cancelCloseTicket as TicketHandler],
  ["reopen_ticket", reopenTicket as TicketHandler],
  ["delete_ticket", deleteTicket as TicketHandler],
  ["ticket_transcript", transcriptTicket as TicketHandler],
]);

export default ticketHandlers;
