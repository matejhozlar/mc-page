import React from "react";
import "./css/team.css";

const admins = [
  {
    name: "SaunHardy",
    uuid: "091b900c-4174-478c-900c-a0fe5a31a329",
    role: "Owner",
    description:
      "Founder of the server. Oversees all systems and development with a watchful eye.",
  },
  {
    name: "Stratos65",
    uuid: "25f73ab5-39e3-4bf7-bd52-9ad7407fdb3e",
    role: "Admin",
    description:
      "Ensures gameplay stays fun and fair, while occasionally summoning chaos.",
  },
  {
    name: "imahomen",
    uuid: "69bc13fe-1972-480e-8075-c88340d7b7da",
    role: "Admin",
    description:
      "Once mined bedrock by accident. Now maintains order with command blocks and sarcasm.",
  },
];

const bots = [
  {
    name: "Web Bot",
    image: "/assets/home/bots/web-bot.png",
    description:
      "Handles site integrations, announcements, and Discord syncing.",
  },
  {
    name: "Createrington Bot",
    image: "/assets/home/bots/createrington-bot.png",
    description:
      "Your trusted in-game assistant, providing real-time economy data.",
  },
];

const Team = () => {
  return (
    <section className="team-page">
      <h2 className="team-heading">The Createrington Team</h2>
      <p className="team-intro">
        Meet the team running the show — from world events to backend magic.
      </p>

      <div className="admin-grid">
        {admins.map((admin) => (
          <div className="admin-card" key={admin.uuid}>
            <img
              src={`https://crafatar.com/avatars/${admin.uuid}?size=128&overlay`}
              alt={`${admin.name}'s avatar`}
              className="admin-avatar"
            />
            <div className="admin-info">
              <h3>{admin.name}</h3>
              <p className="admin-role">{admin.role}</p>
              <p className="admin-description">{admin.description}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="bot-heading">Bots</h3>
      <div className="bot-card-grid">
        {bots.map((bot) => (
          <div className="discord-bot-card" key={bot.name}>
            <img
              src={bot.image}
              alt={`${bot.name} avatar`}
              className="bot-avatar"
            />
            <div className="bot-info">
              <div className="bot-name">
                {bot.name} <span className="bot-tag">BOT</span>
              </div>
              <p className="bot-description">{bot.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Team;
