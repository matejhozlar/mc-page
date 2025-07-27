import createTicket from "./create.js";
import startCloseTicket from "./startClose.js";
import confirmCloseTicket from "./confirmClose.js";
import cancelCloseTicket from "./cancelClose.js";
import reopenTicket from "./reopen.js";
import deleteTicket from "./delete.js";
import transcriptTicket from "./transcript.js";

export const ticketHandlers = new Map([
  ["create_ticket", createTicket],
  ["start_close_ticket", startCloseTicket],
  ["confirm_close_ticket", confirmCloseTicket],
  ["cancel_close_ticket", cancelCloseTicket],
  ["reopen_ticket", reopenTicket],
  ["delete_ticket", deleteTicket],
  ["ticket_transcript", transcriptTicket],
]);
