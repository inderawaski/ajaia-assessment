"use client";

import { createAuthClient } from "better-auth/react";
import { useState, type FormEvent } from "react";

export const authClient = createAuthClient();

export function AccountForm() {
  const [signup, setSignup] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    const password = String(data.get("password"));
    setPending(true);
    setError("");
    try {
      const result = signup
        ? await authClient.signUp.email({ name: String(data.get("name")), email, password })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || "Check your account details and try again.");
        return;
      }
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Request fresh session and document state.
      window.location.assign("/dashboard");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <h1>{signup ? "Create an account" : "Sign in"}</h1>
      {signup && <label>Name<input name="name" autoComplete="name" required /></label>}
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>
        Password
        <input name="password" type="password" required minLength={signup ? 8 : undefined}
          autoComplete={signup ? "new-password" : "current-password"} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button disabled={pending}>{pending ? "Please wait…" : signup ? "Sign up" : "Sign in"}</button>
      <button type="button" disabled={pending} onClick={() => { setSignup(!signup); setError(""); }}>
        {signup ? "Use an existing account" : "Create an account"}
      </button>
    </form>
  );
}
