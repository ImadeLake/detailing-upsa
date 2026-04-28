import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
      <form action={loginAction} className="card card-elevated w-full max-w-sm p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_15%,transparent)] text-[color-mix(in_oklab,var(--accent)_85%,var(--foreground))]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 4 4 5-6" />
              </svg>
            </span>
            <h1 className="text-lg font-semibold tracking-tight">Detailing Dashboard</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Saisissez le code d&apos;accès pour continuer
          </p>
        </div>

        <input type="hidden" name="from" value={from ?? "/"} />

        <div className="space-y-2">
          <label htmlFor="pin" className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
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
            className="input w-full text-base tracking-[0.5em] text-center"
          />
          {error && (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
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
