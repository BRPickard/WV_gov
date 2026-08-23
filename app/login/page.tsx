import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Sign in · WV Document Library" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/folders");

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="card p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="subtle mt-6 text-center text-xs">
          Accounts are issued by an administrator. Contact them if you need access.
        </p>
      </div>
    </main>
  );
}
