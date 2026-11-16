/** Regras de formato do cadastro/login (AU-01b/c). Sem verificação de e-mail no MVP. */
/** Mesma regra do backend (Usernames.isValid: [a-z0-9_.], até 30), mais o mínimo de 4 do Clerk. */
export const USERNAME_RE = /^[a-z0-9._]{4,30}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;

export const normalizeUsername = (raw: string) => raw.trim().replace(/^@/, '').toLowerCase();
export const normalizeEmail = (raw: string) => raw.trim().toLowerCase();
/** Login aceita e-mail ou @usuário. */
export const normalizeIdentifier = (raw: string) => raw.trim().replace(/^@/, '');

export const isValidUsername = (raw: string) => USERNAME_RE.test(normalizeUsername(raw));
export const isValidEmail = (raw: string) => EMAIL_RE.test(normalizeEmail(raw));
export const isValidPassword = (raw: string) => raw.length >= MIN_PASSWORD;

export interface SignUpInput {
  username: string;
  emailAddress: string;
  password: string;
}

export const canSubmitSignUp = (i: SignUpInput) =>
  isValidUsername(i.username) && isValidEmail(i.emailAddress) && isValidPassword(i.password);
