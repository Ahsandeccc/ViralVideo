"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPending(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-5rem)] w-full items-center justify-center bg-pink-50/70 px-5 py-16">
      <section className="glass-panel w-full rounded-3xl p-7 sm:p-10">
        <span className="eyebrow">Restricted area</span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-pink-950 sm:text-4xl">
          Admin sign in
        </h1>
        <p className="mt-3 text-sm leading-6 text-pink-800/70">
          Enter the administrator secret to manage the video library.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="password" className="field-label">Admin secret</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-input"
              placeholder="Enter your secret"
            />
          </div>
          {error && <p role="alert" className="error-message">{error}</p>}
          <button type="submit" disabled={isPending} className="primary-button w-full">
            {isPending ? "Signing in…" : "Open dashboard"}
          </button>
        </form>
      </section>
    </main>
  );
}
