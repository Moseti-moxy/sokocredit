export function formatKES(amount) {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}KES ${abs.toLocaleString('en-KE')}`;
}

export function formatCompactKES(amount) {
  if (Math.abs(amount) >= 1_000_000) {
    return `KSh ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `KSh ${(amount / 1_000).toFixed(0)}K`;
  }
  return `KSh ${amount}`;
}
