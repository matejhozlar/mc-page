export function getCompanyCreationFee(existingCount) {
  if (existingCount <= 0) return 100;
  if (existingCount === 1) return 500;
  return 10000;
}
