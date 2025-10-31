export const toolCosts = {
  wooden: 100,
  stone: 500,
  copper: 2500,
  iron: 10000,
  gold: 50000,
  diamond: 200000,
  netherite: 1000000,
};

export const toolMaterialCosts = {
  stone: { cobble_stone: 100 },
  copper: { cobble_stone: 200, copper_ingot: 25 },
  iron: { cobble_stone: 300, copper_ingot: 40, iron_ingot: 25 },
  gold: {
    cobble_stone: 500,
    copper_ingot: 75,
    iron_ingot: 50,
    gold_ingot: 20,
  },
  diamond: {
    cobble_stone: 700,
    copper_ingot: 100,
    iron_ingot: 75,
    gold_ingot: 50,
    diamond: 10,
  },
  netherite: {
    cobble_stone: 1000,
    copper_ingot: 150,
    iron_ingot: 100,
    gold_ingot: 75,
    diamond: 25,
    netherite_ingot: 5,
  },
};

export const materialDrops = {
  wooden: [
    { name: "cobble_stone", chance: 0.75 },
    { name: "coal", chance: 0.2 },
    { name: "copper_ore", chance: 0.05 },
  ],
  stone: [
    { name: "cobble_stone", chance: 0.74 },
    { name: "coal", chance: 0.2 },
    { name: "copper_ore", chance: 0.06 },
  ],
  copper: [
    { name: "cobble_stone", chance: 0.715 },
    { name: "coal", chance: 0.2 },
    { name: "copper_ore", chance: 0.07 },
    { name: "iron_ore", chance: 0.015 },
  ],
  iron: [
    { name: "cobble_stone", chance: 0.685 },
    { name: "coal", chance: 0.2 },
    { name: "copper_ore", chance: 0.08 },
    { name: "iron_ore", chance: 0.02 },
    { name: "gold_ore", chance: 0.015 },
  ],
  gold: [
    { name: "cobble_stone", chance: 0.635 },
    { name: "coal", chance: 0.2 },
    { name: "copper_ore", chance: 0.09 },
    { name: "iron_ore", chance: 0.03 },
    { name: "gold_ore", chance: 0.025 },
    { name: "diamond", chance: 0.005 },
  ],
  diamond: [
    { name: "cobble_stone", chance: 0.58 },
    { name: "coal", chance: 0.2 },
    { name: "copper_ore", chance: 0.1 },
    { name: "iron_ore", chance: 0.035 },
    { name: "gold_ore", chance: 0.035 },
    { name: "diamond", chance: 0.005 },
    { name: "netherite_ore", chance: 0.001 },
  ],
  netherite: [
    { name: "cobble_stone", chance: 0.5825 },
    { name: "coal", chance: 0.2 },
    { name: "copper_ore", chance: 0.11 },
    { name: "iron_ore", chance: 0.035 },
    { name: "gold_ore", chance: 0.035 },
    { name: "diamond", chance: 0.0075 },
    { name: "netherite_ore", chance: 0.001 },
  ],
  crimson_iron: [
    { name: "cobble_stone", chance: 0.5625 },
    { name: "coal", chance: 0.2 },
    { name: "copper_ore", chance: 0.11 },
    { name: "iron_ore", chance: 0.06 },
    { name: "gold_ore", chance: 0.05 },
    { name: "diamond", chance: 0.015 },
    { name: "netherite_ore", chance: 0.0025 },
  ],
};

export const materialNames = {
  cobble_stone: "Cobblestone",
  copper_ore: "Copper Ore",
  iron_ore: "Iron Ore",
  gold_ore: "Gold Ore",
  diamond: "Diamond",
  netherite_ore: "Netherite Ore",
  coal: "Coal",
  copper_ingot: "Copper Ingot",
  iron_ingot: "Iron Ingot",
  gold_ingot: "Gold Ingot",
  netherite_ingot: "Netherite Ingot",
};

export const autoClickerUpgrades = [
  { rate: 0.5, cost: { cobble_stone: 200, copper_ingot: 1 } },
  { rate: 1.0, cost: { cobble_stone: 500, copper_ingot: 3 } },
  { rate: 2.0, cost: { cobble_stone: 1000, iron_ingot: 10 } },
  { rate: 3.5, cost: { cobble_stone: 2000, gold_ingot: 5 } },
  { rate: 5.0, cost: { cobble_stone: 5000, diamond: 2 } },
  { rate: 7.5, cost: { cobble_stone: 10000, netherite_ingot: 1 } },
];

export const valuePerClick = {
  hand: 0.5,
  wooden: 1,
  stone: 2,
  copper: 4,
  iron: 8,
  gold: 16,
  diamond: 32,
  netherite: 64,
  crimson_iron: 128,
};

export const toolOrder = [
  "wooden",
  "stone",
  "copper",
  "iron",
  "gold",
  "diamond",
  "netherite",
  "crimson_iron",
];

export const offlineEarningsUpgrades = [
  {
    level: 1,
    cost: {
      cobble_stone: 500,
      copper_ingot: 5,
    },
    cap: 30,
  },
  {
    level: 2,
    cost: {
      cobble_stone: 1000,
      copper_ingot: 15,
      iron_ingot: 5,
    },
    cap: 60,
  },
  {
    level: 3,
    cost: {
      cobble_stone: 2000,
      iron_ingot: 20,
      gold_ingot: 5,
    },
    cap: 90,
  },
  {
    level: 4,
    cost: {
      cobble_stone: 3000,
      iron_ingot: 40,
      gold_ingot: 20,
    },
    cap: 120,
  },
  {
    level: 5,
    cost: {
      cobble_stone: 5000,
      diamond: 5,
    },
    cap: 180,
  },
  {
    level: 6,
    cost: {
      cobble_stone: 7500,
      diamond: 10,
      netherite_ingot: 1,
    },
    cap: 240,
  },
  {
    level: 7,
    cost: {
      cobble_stone: 10000,
      diamond: 15,
      netherite_ingot: 2,
    },
    cap: 360,
  },
  {
    level: 8,
    cost: {
      cobble_stone: 15000,
      diamond: 25,
      netherite_ingot: 4,
    },
    cap: 480,
  },
  {
    level: 9,
    cost: {
      cobble_stone: 20000,
      diamond: 35,
      netherite_ingot: 6,
    },
    cap: 600,
  },
  {
    level: 10,
    cost: {
      cobble_stone: 30000,
      diamond: 50,
      netherite_ingot: 10,
    },
    cap: 720,
  },
];

export const RARITY_TIERS = {
  COMMON: {
    name: "Common",
    color: "#b0c3d9",
    glowColor: "rgba(176, 195, 217, 0.3)",
    chance: 0.7992,
  },
  UNCOMMON: {
    name: "Uncommon",
    color: "#5e98d9",
    glowColor: "rgba(94, 152, 217, 0.4)",
    chance: 0.15,
  },
  RARE: {
    name: "Rare",
    color: "#4b69ff",
    glowColor: "rgba(75, 105, 255, 0.5)",
    chance: 0.03,
  },
  EPIC: {
    name: "Epic",
    color: "#8847ff",
    glowColor: "rgba(136, 71, 255, 0.6)",
    chance: 0.016,
  },
  LEGENDARY: {
    name: "Legendary",
    color: "#d32ce6",
    glowColor: "rgba(211, 44, 230, 0.7)",
    chance: 0.004,
  },
  EXOTIC: {
    name: "Exotic",
    color: "#eb4b4b",
    glowColor: "rgba(235, 75, 75, 0.8)",
    chance: 0.0008,
  },
};

export const lootCrateDrops = [
  {
    name: "cobble_stone",
    amount: 250,
    rarity: "COMMON",
    displayName: "Cobblestone Bundle",
  },
  {
    name: "coal",
    amount: 50,
    rarity: "COMMON",
    displayName: "Coal Bundle",
  },
  {
    name: "copper_ore",
    amount: 25,
    rarity: "COMMON",
    displayName: "Copper Ore Bundle",
  },

  {
    name: "copper_ingot",
    amount: 15,
    rarity: "UNCOMMON",
    displayName: "Copper Ingot Pack",
  },
  {
    name: "iron_ore",
    amount: 10,
    rarity: "UNCOMMON",
    displayName: "Iron Ore Pack",
  },
  {
    name: "coal",
    amount: 100,
    rarity: "UNCOMMON",
    displayName: "Large Coal Bundle",
  },

  {
    name: "iron_ingot",
    amount: 10,
    rarity: "RARE",
    displayName: "Iron Ingot Pack",
  },
  {
    name: "gold_ore",
    amount: 5,
    rarity: "RARE",
    displayName: "Gold Ore Pack",
  },
  {
    name: "diamond",
    amount: 1,
    rarity: "RARE",
    displayName: "Diamond",
  },

  {
    name: "gold_ingot",
    amount: 5,
    rarity: "EPIC",
    displayName: "Gold Ingot Pack",
  },
  {
    name: "diamond",
    amount: 3,
    rarity: "EPIC",
    displayName: "Diamond Pack",
  },
  {
    name: "$100_bill",
    amount: 1,
    rarity: "EPIC",
    displayName: "$100 Game Money",
  },

  {
    name: "netherite_ingot",
    amount: 1,
    rarity: "LEGENDARY",
    displayName: "Netherite Ingot",
  },
  {
    name: "diamond",
    amount: 10,
    rarity: "LEGENDARY",
    displayName: "Diamond Cache",
  },
  {
    name: "netherite_ore",
    amount: 1,
    rarity: "LEGENDARY",
    displayName: "Netherite Ore",
  },

  {
    name: "crimson_iron_pick",
    amount: 1,
    rarity: "EXOTIC",
    displayName: "Crimson Iron Pickaxe",
  },
  {
    name: "netherite_ingot",
    amount: 5,
    rarity: "EXOTIC",
    displayName: "Netherite Ingot Cache",
  },
];

export function selectLootCrateItem() {
  const rand = Math.random();
  let cumulative = 0;

  let selectedRarity = "COMMON";
  for (const [tier, data] of Object.entries(RARITY_TIERS)) {
    cumulative += data.chance;
    if (rand <= cumulative) {
      selectedRarity = tier;
      break;
    }
  }

  const itemsInRarity = lootCrateDrops.filter(
    (item) => item.rarity === selectedRarity
  );

  if (itemsInRarity.length === 0) {
    const commonItems = lootCrateDrops.filter(
      (item) => item.rarity === "COMMON"
    );
    return commonItems[Math.floor(Math.random() * commonItems.length)];
  }

  return itemsInRarity[Math.floor(Math.random() * itemsInRarity.length)];
}
