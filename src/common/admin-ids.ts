export function getAdminIds(): number[] {
  return (process.env.ADMIN_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number);
}
