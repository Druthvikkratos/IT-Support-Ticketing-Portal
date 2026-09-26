const HIGH_PRIORITY_HOURS = 24;
const LOW_PRIORITY_HOURS = 72;

export function isOverdue(
  status: string,
  priority: string,
  lastActivityAt: Date,
): boolean {
  if (status === 'solved' || status === 'closed') return false;
  const thresholdHours =
    priority === 'high' ? HIGH_PRIORITY_HOURS : LOW_PRIORITY_HOURS;
  const hoursOpen = (Date.now() - lastActivityAt.getTime()) / (1000 * 60 * 60);
  return hoursOpen > thresholdHours;
}
