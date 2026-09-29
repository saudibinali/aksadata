export type PasswordIssue = "password_short" | "password_long" | null;

export function validatePassword(password: string, minLength: number): PasswordIssue {
  if (Buffer.byteLength(password, "utf8") > 72) return "password_long";
  if ([...password].length < minLength) return "password_short";
  return null;
}

export type UsernameIssue = "invalid_username" | "reserved_username" | null;

export function validateUsername(
  username: string,
  rules: { minLength: number; maxLength: number; pattern: string },
  reserved: boolean,
): UsernameIssue {
  if (reserved) return "reserved_username";
  const length = [...username].length;
  if (length < rules.minLength || length > rules.maxLength) return "invalid_username";

  try {
    const expression = new RegExp(rules.pattern);
    if (!expression.test(username)) return "invalid_username";
  } catch {
    return "invalid_username";
  }

  return null;
}
