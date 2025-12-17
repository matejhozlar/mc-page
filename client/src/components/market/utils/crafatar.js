export function crafatarHead(uuid, size = 32) {
  if (!uuid) return null;
  const clean = String(uuid).replace(/[^0-9a-fA-F-]/g, "");
  if (!clean) return null;
  return `https://mc-heads.net/avatar/${uuid}/${size}`;
}
