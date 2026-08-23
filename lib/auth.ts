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
  // header are rejected, so set this (and TRUSTED_ORIGINS for any extra
  // hostname the app answers on) to match your deployment.
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
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
