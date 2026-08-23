"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error } = await signIn.email({ email, password });

    if (error) {
      setError(describeSignInError(error));
      setPending(false);
      return;
    }

    router.push("/folders");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@wv.gov"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••••"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

/**
 * A rejected password stays deliberately vague — never reveal whether an
 * address is registered. Anything else is a fault the operator has to fix, so
 * say what it actually was rather than blaming the credentials.
 */
function describeSignInError(error: { status?: number; code?: string; message?: string }): string {
  if (error.status === 401 || error.code === "INVALID_EMAIL_OR_PASSWORD") {
    return "Those details did not match an account.";
  }

  if (error.status === 403 && /origin/i.test(error.message ?? "")) {
    return `Rejected by the server: ${error.message}. BETTER_AUTH_URL in .env.local has to match the address in the browser's address bar — restart the server after changing it.`;
  }

  return `Sign-in failed (${error.status ?? "no status"}): ${error.message ?? "no message from the server"}.`;
}
