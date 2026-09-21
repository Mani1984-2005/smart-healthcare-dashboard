// A controllable clock. In demo mode a System Admin can advance it to demonstrate consent expiry
// without waiting real days. The offset is persisted; production behaviour is offset = 0.
export function createClock(repo) {
  return {
    now: () => new Date(Date.now() + (repo.getMeta("clockOffsetMs", 0) || 0)),
    offsetDays: () => Math.round(((repo.getMeta("clockOffsetMs", 0) || 0) / 86_400_000) * 100) / 100,
    advanceDays(days) {
      repo.setMeta("clockOffsetMs", (repo.getMeta("clockOffsetMs", 0) || 0) + days * 86_400_000);
    },
    reset: () => repo.setMeta("clockOffsetMs", 0),
  };
}
