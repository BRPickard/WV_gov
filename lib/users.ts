import { createLocalAccountIssuer } from "better-auth";
import { auth } from "./auth";
import { setUserRole } from "./access";
import type { Role } from "./types";

export const MIN_PASSWORD_LENGTH = 10;

/**
 * Creates a credential account the same way Better Auth's own /sign-up/email
 * endpoint does. Public sign-up stays disabled — only the admin console reaches
 * this, so accounts can only ever be issued deliberately.
 */
export async function createUserAccount(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<{ error?: string; userId?: string }> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (name === "") return { error: "A name is required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email address looks invalid." };
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const context = await auth.$context;

  if (await context.internalAdapter.findUserByEmail(email)) {
    return { error: "An account with that email already exists." };
  }

  const hash = await context.password.hash(input.password);
  const user = await context.internalAdapter.createUser(
    { name, email, emailVerified: false },
    { method: "email-password" },
  );

  await context.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    issuer: createLocalAccountIssuer("credential"),
    accountId: user.id,
    password: hash,
  });

  setUserRole(user.id, input.role);
  return { userId: user.id };
}

/** Admin-issued password reset; also ends the user's existing sessions. */
export async function setUserPassword(userId: string, password: string): Promise<{ error?: string }> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const context = await auth.$context;
  await context.internalAdapter.updatePassword(userId, await context.password.hash(password));
  await context.internalAdapter.deleteUserSessions(userId);
  return {};
}

export async function deleteUserAccount(userId: string) {
  const context = await auth.$context;
  await context.internalAdapter.deleteUserSessions(userId);
  await context.internalAdapter.deleteAccounts(userId);
  await context.internalAdapter.deleteUser(userId);
}
