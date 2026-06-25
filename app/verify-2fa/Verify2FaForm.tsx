"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Verify2FaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (json.locked) {
        router.push("/login?error=locked");
        return;
      }
      setError(json.error ?? "Invalid code. Please try again.");
      setCode("");
      return;
    }

    const from = searchParams.get("from") || "/";
    router.push(from);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-navy-light border border-navy-lighter rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white text-center">
          Two-Factor Authentication
        </h1>
        <p className="text-gray-400 text-sm text-center mt-2 mb-6">
          Enter the 6-digit code from Google Authenticator or Authy.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            required
            autoFocus
            className="w-full px-4 py-3 bg-navy border border-navy-lighter rounded-lg text-white text-center text-2xl tracking-[0.3em] placeholder-gray-600 focus:outline-none focus:border-accent"
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}
