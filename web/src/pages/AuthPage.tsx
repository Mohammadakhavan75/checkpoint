import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

type AuthPageProps = {
  mode: "login" | "signup";
};

export function AuthPage({ mode }: AuthPageProps) {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/today" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate("/today", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not continue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-label={mode === "signup" ? "Create account" : "Log in"}>
        <div className="brand auth-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Checkpoint</span>
        </div>
        <h1>{mode === "signup" ? "Create your checkpoint" : "Return to Checkpoint"}</h1>
        <p>Your life, resumable.</p>
        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="text" inputMode="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : 1}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full-width" type="submit" disabled={submitting}>
            {submitting ? "Please wait" : mode === "signup" ? "Sign up" : "Log in"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <Link to={mode === "signup" ? "/login" : "/signup"}>{mode === "signup" ? "Log in" : "Create one"}</Link>
        </p>
      </section>
    </main>
  );
}
