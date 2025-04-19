import React from "react";

const Rules = () => {
  return (
    <div className="rules-container">
      <h1>Server Rules</h1>
      <ol>
        <li>
          <strong>Respect All Players</strong>
          <p>
            Treat everyone with respect. Harassment, discrimination, and
            offensive language are not tolerated. This includes chat, signs,
            builds, and any other form of communication.
          </p>
        </li>
        <li>
          <strong>No Griefing or Stealing</strong>
          <p>
            Do not destroy or alter other players' builds without permission.
            Respect private property and don't take items that don't belong to
            you, even if containers are not locked.
          </p>
        </li>
        <li>
          <strong>No Cheating or Exploits</strong>
          <p>
            Don't use any mods, hacks, or exploits that give you an unfair
            advantage. Allowed mods are those, which are already in the modpack,
            and purely cosmetic mods.
          </p>
        </li>
        <li>
          <strong>Build Responsibly</strong>
          <p>
            Keep a reasonable distance from other players' builds unless you
            have permission. Avoid excessive contraptions that might cause lag.
            Clean up floating trees and creeper holes.
          </p>
        </li>
        <li>
          <strong>PvP Rules</strong>
          <p>
            PvP is only allowed when both parties consent. No spawn killing,
            trapping, or luring players into PvP without their knowledge.
          </p>
        </li>
        <li>
          <strong>Staff Decisions are Final</strong>
          <p>
            Respect staff decisions. If you have a complaint, please discuss it
            privately with the appropriate staff member instead of causing drama
            in public channels.
          </p>
        </li>
      </ol>
      <p className="rules-warning">
        Failure to follow these rules may result in warnings, temporary bans, or
        permanent removal from the server depending on the severity and
        frequency of violations. If you witness rule violations, please report
        them to staff rather than taking matters into your own hands.
      </p>
    </div>
  );
};

export default Rules;
