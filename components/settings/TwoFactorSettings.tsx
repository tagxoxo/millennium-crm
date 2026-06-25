"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SetupData = {
  qrDataUrl: string;
  manualCode: string;
  email: string;
};

export default function TwoFactorSettings() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/2fa/status")
      .then((r) => r.json())
      .then((json) => {
        setEnabled(Boolean(json.enabled));
      })
      .finally(() => setLoadingStatus(false));
  }, []);

  async function startSetup() {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Setup failed");
      setSetupData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/2fa/confirm-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: setupCode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Invalid code");

      setEnabled(true);
      setSetupData(null);
      setSetupCode("");
      setSuccess("2FA is now active");
      router.push("/verify-2fa?from=/settings/2fa");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function disable2fa(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Invalid code");

      setEnabled(false);
      setDisableCode("");
      setSuccess("2FA has been disabled");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable 2FA");
    } finally {
      setBusy(false);
    }
  }

  if (loadingStatus) {
    return <p className="text-gray-400">Loading security settings...</p>;
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Two-Factor Authentication
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Protect your CRM with a code from your phone.
        </p>
      </div>

      <div className="bg-navy-light border border-navy-lighter rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-400">Status</span>
          {enabled ? (
            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/40">
              2FA Active
            </span>
          ) : (
            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/40">
              2FA Disabled
            </span>
          )}
        </div>

        {!enabled && !setupData && (
          <p className="text-gray-400 text-sm mb-4">
            Enable two-factor authentication to require a code from your phone
            each time you sign in.
          </p>
        )}

        {success && (
          <p className="text-green-400 text-sm mb-4">{success}</p>
        )}
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {!enabled && !setupData && (
          <button
            type="button"
            onClick={startSetup}
            disabled={busy}
            className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {busy ? "Generating..." : "Enable 2FA"}
          </button>
        )}

        {setupData && (
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Download <strong>Google Authenticator</strong> or{" "}
              <strong>Authy</strong> on your phone to scan this QR code.
            </p>
            <div className="flex justify-center bg-white p-4 rounded-lg">
              <img
                src={setupData.qrDataUrl}
                alt="QR code for authenticator app"
                width={200}
                height={200}
              />
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Manual entry code</p>
              <p className="text-white font-mono text-sm break-all bg-navy border border-navy-lighter rounded-lg px-3 py-2">
                {setupData.manualCode}
              </p>
            </div>
            <form onSubmit={confirmSetup} className="space-y-3">
              <label className="block text-sm text-gray-400">
                Enter the 6-digit code from your app to confirm
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={setupCode}
                onChange={(e) =>
                  setSetupCode(e.target.value.replace(/\D/g, ""))
                }
                placeholder="000000"
                className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white text-center text-xl tracking-widest focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={busy || setupCode.length !== 6}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50"
              >
                {busy ? "Verifying..." : "Confirm & Enable 2FA"}
              </button>
            </form>
          </div>
        )}

        {enabled && (
          <form onSubmit={disable2fa} className="space-y-3 mt-2">
            <p className="text-gray-400 text-sm">
              To disable 2FA, enter your current 6-digit code.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={(e) =>
                setDisableCode(e.target.value.replace(/\D/g, ""))
              }
              placeholder="000000"
              className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white text-center text-xl tracking-widest focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy || disableCode.length !== 6}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {busy ? "Disabling..." : "Disable 2FA"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
