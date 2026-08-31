"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
      return;
    }

    const body = await res.json().catch(() => ({}));
    setError(body.error ?? "Login failed");
    setPending(false);
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <span className={styles.logo}>myHub.</span>
      <input
        className={styles.input}
        type="password"
        name="password"
        placeholder="Password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <span className={styles.error}>{error}</span>}
      <button className={styles.button} type="submit" disabled={pending || password.length === 0}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
