// Username <-> email mapping. Semua user login pakai username,
// tapi Supabase Auth pakai email internal domain "pesantren.internal".
export const INTERNAL_EMAIL_DOMAIN = "pesantren.internal";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function emailToUsername(email: string): string {
  return email.split("@")[0] ?? email;
}
