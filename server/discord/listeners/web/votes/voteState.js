export const voteState = {
  active: false,
  cooldownUntil: 0,
  counts: { yes: 0, no: 0 },
  voters: new Set(),
  timeout: null,
};
