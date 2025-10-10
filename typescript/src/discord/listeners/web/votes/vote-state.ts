export interface VoteState {
  active: boolean;
  cooldownUntil: number;
  counts: { yes: number; no: number };
  voters: Set<string>;
  timeout: NodeJS.Timeout | null;
}

export const voteState: VoteState = {
  active: false,
  cooldownUntil: 0,
  counts: { yes: 0, no: 0 },
  voters: new Set<string>(),
  timeout: null,
};

export function resetVoteState(): void {
  voteState.active = false;
  voteState.cooldownUntil = 0;
  voteState.counts.yes = 0;
  voteState.counts.no = 0;
  voteState.voters.clear();
  if (voteState.timeout) {
    clearTimeout(voteState.timeout);
    voteState.timeout = null;
  }
}
