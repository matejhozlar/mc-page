import {
  materialDrops,
  valuePerClick,
  autoClickerUpgrades,
} from "./toolData.js";

function calculateOfflineEarnings({
  logoutTime,
  currentTime,
  autoClickLevel,
  offlineEarningsLevel,
  tool,
}) {
  if (autoClickLevel < 1 || offlineEarningsLevel < 1) return null;

  const offlineCapMinutes = [30, 60, 90, 120, 180, 240, 360, 480, 600, 720][
    offlineEarningsLevel - 1
  ];
  const elapsedMs = currentTime - new Date(logoutTime).getTime();
  const cappedMs = Math.min(elapsedMs, offlineCapMinutes * 60 * 1000);

  if (cappedMs < 10_000) return null;

  const rate = autoClickerUpgrades[autoClickLevel - 1]?.rate || 1;
  const clicks = Math.floor((cappedMs / 1000) * rate);
  const points = clicks * (valuePerClick[tool] || 0);

  const drops = materialDrops[tool] || [];
  const materials = {};

  const blockBreaks = Math.floor(clicks / 10);

  for (let i = 0; i < blockBreaks; i++) {
    const rand = Math.random();
    let cumulative = 0;
    for (const drop of drops) {
      cumulative += drop.chance;
      if (rand <= cumulative) {
        materials[drop.name] = (materials[drop.name] || 0) + 1;
        break;
      }
    }
  }

  return {
    points,
    materials,
    minutes: Math.floor(cappedMs / 60000),
  };
}

export default calculateOfflineEarnings;
