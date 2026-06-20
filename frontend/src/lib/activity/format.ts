export function parseUtcDate(dateStr: string | Date | undefined | null): Date {
  if (!dateStr) return new Date(0); // Fallback to epoch so it doesn't break sorting
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === "string" && !dateStr.endsWith("Z") && !/([+-][0-9]{2}:[0-9]{2})$/.test(dateStr)) {
    return new Date(dateStr + "Z");
  }
  return new Date(dateStr);
}

export function formatTimeAgo(dateInput: Date | string): string {
  const date = parseUtcDate(dateInput);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 7) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  if (days > 0) return `${days}d ago`;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h ago`;

  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes > 0) return `${minutes}m ago`;

  return "Just now";
}
