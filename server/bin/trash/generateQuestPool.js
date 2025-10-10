import fs from "fs";

const filePath = "./player_stats.json";
const raw = fs.readFileSync(filePath, "utf-8");
const stats = JSON.parse(raw);

const statTypes = {
  mined: "Mine",
  crafted: "Craft",
  used: "Use",
  killed: "Kill",
  picked_up: "Pick up",
  dropped: "Drop",
  broken: "Break",
  placed: "Place",
  custom: null,
};

const getTargetForType = (type) => {
  switch (type) {
    case "crafted":
      return [1, 5, 10, 20][Math.floor(Math.random() * 4)];
    case "killed":
      return [30, 50, 100][Math.floor(Math.random() * 3)];
    case "mined":
      return [100, 1000, 2500][Math.floor(Math.random() * 3)];
    default:
      return Math.floor(Math.random() * 10 + 1) * 10;
  }
};

const formatName = (key) => {
  const [namespace, name] = key.split(":");
  return `${capitalize(namespace)} ${name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())}`;
};

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const quests = [];

for (const fullType of Object.keys(stats)) {
  const entries = stats[fullType];
  const type = fullType.replace("minecraft:", "");

  if (!statTypes[type]) continue;

  for (const itemId of entries) {
    quests.push({
      quest_type: type,
      quest_key: itemId,
      target_count: getTargetForType(type),
      description: `${statTypes[type]} ${formatName(itemId)}`,
    });
  }
}

fs.writeFileSync(
  "./questsPool.js",
  `export const questsPool = ${JSON.stringify(quests, null, 2)};`,
  "utf-8"
);

console.log(`Generated ${quests.length} quests and saved to questsPool.js`);
