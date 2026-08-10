export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function requiredError(value: string, label: string): string | undefined {
  return value.trim() ? undefined : `${label} is required`;
}

export function emailError(value: string): string | undefined {
  if (!value.trim()) return "Email is required";
  if (!isValidEmail(value)) return "Enter a valid email address";
  return undefined;
}
