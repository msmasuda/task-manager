export function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]!);
}

const dateTimeFormat = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" });

// Appointment date/time for email bodies, already HTML-escaped.
export function emailDateTime(date: Date) {
  return escapeHtml(dateTimeFormat.format(date));
}
