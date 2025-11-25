// Format user ID: 001-999 with padding, 1000-99999 without padding
export function formatUserId(id: number): string {
  return id <= 999 ? String(id).padStart(3, '0') : String(id);
}
