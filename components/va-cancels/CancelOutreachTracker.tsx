"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatVaDate, formatVaTime, todayInAgencyTz } from "@/lib/va";
import {
  CANCEL_CADENCE,
  dueStepProgress,
  formatAmountDue,
  getTrackerState,
  groupCancelRows,
  stepDate,
  stepState,
  telHref,
  type CancelLogAction,
  type CancelOutreach,
} from "@/lib/vaCancelOutreach";

const inputClass =
  "w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm";

const STEP_SHORT: Record<number, string> = {
  1: "Call + VM",
  2: "Call",
  3: "Leave VM",
  5: "Call",
  8: "Call + VM",
};

function stepCircleClass(state: ReturnType<typeof stepState>): string {
  if (state === "done") return "bg-emerald-500 text-navy shadow-[0_0_16px_rgba(16,185,129,0.45)]";
  if (state === "due") {
    return "bg-accent text-navy ring-4 ring-accent/30 shadow-[0_0_22px_rgba(96,165,250,0.55)]";
  }
  if (state === "overdue") {
    return "bg-amber-400 text-navy ring-4 ring-amber-400/25";
  }
  return "bg-navy-lighter text-gray-400";
}

function stepLineClass(state: ReturnType<typeof stepState>): string {
  if (state === "done") return "bg-emerald-500/80";
  if (state === "due" || state === "overdue") return "bg-accent/50";
  return "bg-navy-lighter";
}

function CadenceTrack({ row }: { row: CancelOutreach }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex items-start min-w-[420px]">
        {CANCEL_CADENCE.map((step, index) => {
          const state = stepState(step, row);
          const date = stepDate(row.cancelled_date, step.day);
          return (
            <div key={step.day} className="flex items-start flex-1 last:flex-none">
              <div className="flex flex-col items-center w-[72px]">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${stepCircleClass(
                    state
                  )}`}
                >
                  {state === "done" ? "✓" : step.day}
                </div>
                <p
                  className={`text-[10px] font-semibold mt-2 text-center leading-tight ${
                    state === "due"
                      ? "text-accent"
                      : state === "overdue"
                        ? "text-amber-300"
                        : state === "done"
                          ? "text-emerald-300"
                          : "text-gray-500"
                  }`}
                >
                  {STEP_SHORT[step.day]}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {formatVaDate(date).replace(/^[A-Za-z]{3}, /, "")}
                </p>
              </div>
              {index < CANCEL_CADENCE.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mt-5 rounded-full ${stepLineClass(state)}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CancelCard({
  row,
  canEdit,
  patchUrl,
}: {
  row: CancelOutreach;
  canEdit: boolean;
  patchUrl: (id: string) => string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState<CancelLogAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const state = getTrackerState(row);
  const progress = state.dueStep
    ? dueStepProgress(state.dueStep, row.attempts)
    : null;
  const callLink = telHref(row.phone_number);

  const cardTone =
    state.kind === "overdue"
      ? "border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-navy-light to-navy-light"
      : state.kind === "due_today"
        ? "border-accent/45 bg-gradient-to-br from-accent/15 via-navy-light to-navy-light"
        : state.kind === "reinstated"
          ? "border-emerald-500/35 bg-navy-light"
          : state.kind === "closed"
            ? "border-navy-lighter bg-navy-light/80 opacity-80"
            : "border-navy-lighter bg-navy-light";

  async function log(action: CancelLogAction) {
    setSaving(action);
    setError(null);
    try {
      const res = await fetch(patchUrl(row.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save that.");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <article className={`rounded-2xl border p-5 space-y-4 ${cardTone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{row.client_name}</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            Policy {row.policy_number}
            <span className="text-gray-600"> · </span>
            Canceled {formatVaDate(row.cancelled_date)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-white">{formatAmountDue(row.amount_due)}</p>
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Amount due</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {callLink ? (
          <a
            href={callLink}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy border border-navy-lighter text-sm text-white hover:border-accent"
          >
            <span>📞</span>
            {row.phone_number}
          </a>
        ) : (
          <span className="text-sm text-gray-400">{row.phone_number}</span>
        )}
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
            state.kind === "overdue"
              ? "bg-amber-500/15 text-amber-200 border-amber-500/40"
              : state.kind === "due_today"
                ? "bg-accent/15 text-accent border-accent/40"
                : state.kind === "reinstated"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  : state.kind === "closed"
                    ? "bg-navy-lighter text-gray-400 border-navy-lighter"
                    : "bg-navy text-gray-300 border-navy-lighter"
          }`}
        >
          {state.headline}
        </span>
      </div>

      <CadenceTrack row={row} />

      <div className="rounded-xl bg-navy/70 border border-navy-lighter px-4 py-3">
        <p className="text-white font-medium">{state.detail}</p>
        {progress && state.dueStep && (
          <p className="text-xs text-gray-400 mt-1">
            {state.dueStep.needsCall && (
              <span className={progress.called ? "text-emerald-300" : "text-gray-400"}>
                Call {progress.called ? "done" : "needed"}
              </span>
            )}
            {state.dueStep.needsCall && state.dueStep.needsVm && (
              <span className="text-gray-600"> · </span>
            )}
            {state.dueStep.needsVm && (
              <span className={progress.vm ? "text-emerald-300" : "text-gray-400"}>
                Voicemail {progress.vm ? "done" : "needed"}
              </span>
            )}
          </p>
        )}
      </div>

      {row.attempts.length > 0 && (
        <ul className="space-y-1">
          {row.attempts.map((attempt, index) => (
            <li key={`${attempt.day}-${attempt.kind}-${attempt.at}-${index}`} className="text-xs text-gray-400">
              Day {attempt.day} · {attempt.kind === "vm" ? "Left VM" : attempt.kind === "spoke" ? "Spoke" : "Called"} ·{" "}
              {formatVaTime(attempt.at)}
              {attempt.note ? ` — ${attempt.note}` : ""}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="space-y-3">
          {(state.kind === "due_today" || state.kind === "overdue") && state.dueStep && (
            <>
              <input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note (no answer, callback time…)"
                className={inputClass}
              />
              <div className="flex flex-wrap gap-2">
                {state.dueStep.needsCall && state.dueStep.needsVm && (
                  <button
                    type="button"
                    disabled={Boolean(saving)}
                    onClick={() => void log("call_vm")}
                    className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
                  >
                    {saving === "call_vm" ? "Saving..." : "Called + left VM"}
                  </button>
                )}
                {state.dueStep.needsCall && (
                  <button
                    type="button"
                    disabled={Boolean(saving) || Boolean(progress?.called)}
                    onClick={() => void log("call")}
                    className="px-4 py-2 rounded-lg bg-navy border border-navy-lighter hover:border-accent text-white text-sm font-medium disabled:opacity-50"
                  >
                    {saving === "call" ? "Saving..." : "Called"}
                  </button>
                )}
                {state.dueStep.needsVm && (
                  <button
                    type="button"
                    disabled={Boolean(saving) || Boolean(progress?.vm)}
                    onClick={() => void log("vm")}
                    className="px-4 py-2 rounded-lg bg-navy border border-navy-lighter hover:border-accent text-white text-sm font-medium disabled:opacity-50"
                  >
                    {saving === "vm" ? "Saving..." : "Left voicemail"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={Boolean(saving)}
                  onClick={() => void log("spoke")}
                  className="px-4 py-2 rounded-lg bg-navy border border-emerald-500/40 hover:border-emerald-400 text-emerald-200 text-sm font-medium disabled:opacity-50"
                >
                  {saving === "spoke" ? "Saving..." : "Spoke with them"}
                </button>
              </div>
            </>
          )}

          {row.status === "active" && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(saving)}
                onClick={() => void log("reinstated")}
                className="px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 disabled:opacity-50"
              >
                {saving === "reinstated" ? "Saving..." : "They reinstated"}
              </button>
              <button
                type="button"
                disabled={Boolean(saving)}
                onClick={() => void log("closed")}
                className="px-4 py-2 rounded-lg bg-navy border border-navy-lighter text-gray-400 text-sm hover:text-white disabled:opacity-50"
              >
                {saving === "closed" ? "Saving..." : "Stop calling"}
              </button>
            </div>
          )}

          {row.status !== "active" && (
            <button
              type="button"
              disabled={Boolean(saving)}
              onClick={() => void log("reopen")}
              className="px-4 py-2 rounded-lg bg-navy border border-navy-lighter text-gray-300 text-sm hover:text-white disabled:opacity-50"
            >
              {saving === "reopen" ? "Saving..." : "Put back on the list"}
            </button>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}
    </article>
  );
}

function AddCancelForm() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [cancelledDate, setCancelledDate] = useState(todayInAgencyTz());
  const [amountDue, setAmountDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/va/cancels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          phone_number: phoneNumber,
          policy_number: policyNumber,
          cancelled_date: cancelledDate,
          amount_due: amountDue,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add this person.");
      setClientName("");
      setPhoneNumber("");
      setPolicyNumber("");
      setCancelledDate(todayInAgencyTz());
      setAmountDue("");
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this person.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-navy-light border border-navy-lighter rounded-2xl p-5 md:p-6">
      <h2 className="text-lg font-semibold text-white">Add from today&apos;s spreadsheet</h2>
      <p className="text-sm text-gray-400 mt-1 mb-4">
        Type them in one at a time — name, phone, policy number, cancelled date, and amount due.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name *</label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Maria Lopez"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Phone number *</label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="931-555-0100"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Policy number *</label>
            <input
              type="text"
              required
              value={policyNumber}
              onChange={(event) => setPolicyNumber(event.target.value)}
              placeholder="TX123456"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Cancelled date *</label>
            <input
              type="date"
              required
              value={cancelledDate}
              onChange={(event) => setCancelledDate(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Amount due *</label>
            <input
              type="text"
              required
              inputMode="decimal"
              value={amountDue}
              onChange={(event) => setAmountDue(event.target.value)}
              placeholder="187.50"
              className={inputClass}
            />
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-emerald-400 text-sm">Added to the call list.</p>}
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add to call list"}
        </button>
      </form>
    </section>
  );
}

function Section({
  title,
  count,
  children,
  empty,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  empty: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">
        {title}
        <span className="text-sm font-normal text-gray-400 ml-2">{count}</span>
      </h2>
      {count === 0 ? (
        <div className="bg-navy-light border border-navy-lighter rounded-xl p-6 text-center text-gray-400 text-sm">
          {empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{children}</div>
      )}
    </section>
  );
}

export default function CancelOutreachTracker({
  rows,
  mode,
}: {
  rows: CancelOutreach[];
  mode: "va" | "crm";
}) {
  const grouped = useMemo(() => groupCancelRows(rows), [rows]);
  const dueCount = grouped.dueNow.length;
  const patchUrl =
    mode === "va"
      ? (id: string) => `/api/va/cancels/${id}`
      : (id: string) => `/api/cancels/${id}`;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
          <p className="text-2xl font-bold text-white">{dueCount}</p>
          <p className="text-xs text-accent mt-0.5">Need a call now</p>
        </div>
        <div className="rounded-xl border border-navy-lighter bg-navy-light px-4 py-3">
          <p className="text-2xl font-bold text-white">{grouped.rest.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Rest day</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-2xl font-bold text-white">{grouped.reinstated.length}</p>
          <p className="text-xs text-emerald-300 mt-0.5">Reinstated</p>
        </div>
        <div className="rounded-xl border border-navy-lighter bg-navy-light px-4 py-3">
          <p className="text-2xl font-bold text-white">{grouped.closed.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Stopped</p>
        </div>
      </div>

      <div className="rounded-2xl border border-navy-lighter bg-navy-light px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
          Call cadence from cancelled date
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {CANCEL_CADENCE.map((step) => (
            <span
              key={step.day}
              className="inline-flex items-center gap-2 rounded-full bg-navy px-3 py-1.5 border border-navy-lighter text-gray-300"
            >
              <span className="h-5 w-5 rounded-full bg-accent/20 text-accent text-[11px] font-bold flex items-center justify-center">
                {step.day}
              </span>
              {step.label}
            </span>
          ))}
        </div>
      </div>

      <Section
        title="Call these now"
        count={grouped.dueNow.length}
        empty="Nobody is due for a call right now."
      >
        {grouped.dueNow.map((row) => (
          <CancelCard key={row.id} row={row} canEdit patchUrl={patchUrl} />
        ))}
      </Section>

      {mode === "va" && <AddCancelForm />}

      <Section
        title="Waiting on the next cadence day"
        count={grouped.rest.length}
        empty="No one is sitting on a rest day."
      >
        {grouped.rest.map((row) => (
          <CancelCard key={row.id} row={row} canEdit patchUrl={patchUrl} />
        ))}
      </Section>

      {grouped.finished.length > 0 && (
        <Section
          title="Finished the 8-day cadence"
          count={grouped.finished.length}
          empty=""
        >
          {grouped.finished.map((row) => (
            <CancelCard key={row.id} row={row} canEdit patchUrl={patchUrl} />
          ))}
        </Section>
      )}

      {(grouped.reinstated.length > 0 || grouped.closed.length > 0) && (
        <Section
          title="Closed"
          count={grouped.reinstated.length + grouped.closed.length}
          empty=""
        >
          {[...grouped.reinstated, ...grouped.closed].map((row) => (
            <CancelCard key={row.id} row={row} canEdit patchUrl={patchUrl} />
          ))}
        </Section>
      )}
    </div>
  );
}
