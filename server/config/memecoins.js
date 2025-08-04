export default {
  // Memecoins
  UPWARD_BIAS: 0.505, // Chance of a coin going up in price
  CRASH_PRICE_THRESHOLD: 0.002, // If token price is lower -> crash
  VOLATILITY: {
    // Volatility of the coins
    LOW: {
      PRICE_THRESHOLD: 5,
      MIN: 0.01,
      MAX: 0.03,
    },
    MID: {
      PRICE_THRESHOLD: 1000,
      MAX: 0.1,
    },
    HIGH: {
      PRICE_THRESHOLD: 10000,
      MAX: 0.3,
    },
  },
};
