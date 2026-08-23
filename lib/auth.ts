import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";

/**
 * Better Auth is configured for email + password only. Self-service sign up is
 * disabled: accounts are created by an administrator from the admin console,
 * which mirrors how an internal document library is normally administered.
 */
export const auth = betterAuth({
  appName: "WV Excel Manager",
  database: db,
  // The origin the app is served from. Requests carrying a different Origin
  // header are rejected, so this has to match the address in the browser.
  //
  // Left unset in development, Better Auth infers it from the request, so the
  // app works on whatever port Next actually picked and on localhost or
  // 127.0.0.1 alike. In production set BETTER_AUTH_URL (and TRUSTED_ORIGINS
  // for any extra hostname the app answers on): inference there would trust
  // whatever Host header a request arrives with.
  baseURL: resolveBaseURL(),
  trustedOrigins: resolveTrustedOrigins(),
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    autoSignIn: true,
    minPasswordLength: 10,
  },
  session: {
    expiresIn: 60 * 60 * 8, // 8 hour working session
    updateAge: 60 * 60, // refresh at most once an hour
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "member",
        input: false, // never settable from a client request
      },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [nextCookies()],
});

export type AppSession = typeof auth.$Infer.Session;
export type AppUser = AppSession["user"];

function resolveBaseURL(): string | undefined {
  const configured = process.env.BETTER_AUTH_URL?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[auth] BETTER_AUTH_URL is not set. Falling back to the request's own host, " +
        "which trusts the incoming Host header. Set it to your real origin.",
    );
  }

  return undefined; // inferred per request
}

/**
 * Extra origins allowed to call the auth API. In development the local host is
 * trusted on any port, so the app works whether Next landed on 3000 or 3001 and
 * whether the address bar says localhost or 127.0.0.1 — origin mismatches there
 * are a dead end that looks exactly like a wrong password. Production gets only
 * what TRUSTED_ORIGINS names.
 */
function resolveTrustedOrigins(): string[] {
  const configured = (process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === "production") return configured;

  return [
    ...configured,
    "http://localhost:*",
    "http://127.0.0.1:*",
    "http://[::1]:*",
  ];
}
