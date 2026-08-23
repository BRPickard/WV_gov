import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import type { Role, SessionUser } from "./types";

function normalise(user: { id: string; name: string; email: string; role?: string | null }): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user.role === "admin" ? "admin" : "member") as Role,
  };
}

/** The signed-in user, or null. Safe to call from any server component. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? normalise(session.user) : null;
}

/** Same, but bounces anonymous visitors to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/folders");
  return user;
}

/** For route handlers: returns the user or null without redirecting. */
export async function getApiUser(request: Request): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session ? normalise(session.user) : null;
}
