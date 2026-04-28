import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Activity } from "lucide-react";
import { AUTH_COOKIE, checkPin, createAuthToken } from "@/lib/auth";

async function loginAction(formData: FormData) {
  "use server";
  const pin = String(formData.get("pin") ?? "");
  const from = String(formData.get("from") ?? "/");
  if (!checkPin(pin)) {
    redirect(`/login?error=1&from=${encodeURIComponent(from)}`);
  }
  const token = await createAuthToken();
  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(from || "/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { error, from } = await searchParams;
  return (
    <main className="auth-shell px-6">
      <form action={loginAction} className="card card-elevated w-full max-w-sm p-7 space-y-6">
        <div className="space-y-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded"
            style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
          >
            <Activity size={16} />
          </span>
          <h1 className="text-[18px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
            Detailing Dashboard
          </h1>
          <p className="text-[13px]" style={{ color: "var(--ink-dim)" }}>
            Saisissez le code d&apos;accès pour continuer.
          </p>
        </div>

        <input type="hidden" name="from" value={from ?? "/"} />

        <div className="space-y-2">
          <label htmlFor="pin" className="label">
            Code
          </label>
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoFocus
            required
            placeholder="••••"
            className="input w-full text-base tracking-[0.5em] text-center py-2.5"
          />
          {error && (
            <p className="text-[12.5px]" style={{ color: "var(--danger)" }}>
              Code incorrect.
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary w-full">
          Entrer
        </button>
      </form>
    </main>
  );
}
