"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatVaDate, formatVaTime, todayInAgencyTz } from "@/lib/va";
import { stepDate, telHref, nextWeekday } from "@/lib/vaCancelOutreach";
import {
  INBOUND_CADENCE,
  getInboundTrackerState,
  groupInboundRows,
  inboundPickupScript,
  inboundStepProgress,
  inboundStepState,
  type InboundLead,
  type InboundLogAction,
} from "@/lib/vaInboundOutreach";

const inputClass =
  "w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm";

const STEP_SHORT: Record<number, string> = {
  1: "2x + VM1",
  2: "Call",
  3: "Call+VM2",
  4: "Call",
  5: "Call",
  6: "Call+VM3",
  7: "Call",
};

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function stepCircleClass(state: ReturnType<typeof inboundStepState>): string {
  if (state === "done") return "bg-emerald-500 text-navy shadow-[0_0_16px_rgba(16,185,129,0.45)]";
  if (state === "due") {
    return "bg-accent text-navy ring-4 ring-accent/30 shadow-[0_0_22px_rgba(96,165,250,0.55)]";
  }
  if (state === "overdue") return "bg-amber-400 text-navy ring-4 ring-amber-400/25";
  return "bg-navy-lighter text-gray-400";
}

function InboundCadenceTrack({ row }: { row: InboundLead }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {INBOUND_CADENCE.map((step) => {
        const state = inboundStepState(step, row);
        const date = stepDate(row.start_date, step.day);
        return (
          <div key={step.day} className="flex flex-col items-center min-w-0">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${stepCircleClass(
                state
              )}`}
            >
              {state === "done" ? "✓" : step.day}
            </div>
            <p
              className={`text-[9px] font-semibold mt-1.5 text-center leading-tight ${
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
            <p className="text-[9px] text-gray-500 mt-0.5">
              {formatVaDate(date).replace(/^[A-Za-z]{3}, /, "")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function PickupScript({ name }: { name: string }) {
  const script = inboundPickupScript(name);
  return (
    <div className="rounded-xl bg-navy/70 border border-accent/30 px-4 py-3 space-y-2 text-sm">
      <p className="text-[11px] uppercase tracking-wide text-accent font-semibold">
        If they pick up
      </p>
      <p className="text-white leading-relaxed">“{script.pickup}”</p>
      <p className="text-emerald-200">
        <span className="font-semibold">If yes: </span>
        “{script.yes}”
      </p>
      <p className="text-amber-200">
        <span className="font-semibold">If no: </span>
        {script.no}
      </p>
    </div>
  );
}

function InboundCard({
  row,
  canEdit,
  patchUrl,
}: {
  row: InboundLead;
  canEdit: boolean;
  patchUrl: (id: string) => string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [saving, setSaving] = useState<InboundLogAction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state = getInboundTrackerState(row);
  const progress = state.dueStep
    ? inboundStepProgress(state.dueStep, row.attempts)
    : null;
  const callLink = telHref(row.phone_number);
  const showCallButtons =
    canEdit &&
    (state.kind === "due_today" || state.kind === "overdue") &&
    Boolean(state.dueStep);

  const cardTone =
    state.kind === "overdue"
      ? "border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-navy-light to-navy-light"
      : state.kind === "due_today"
        ? "border-accent/45 bg-gradient-to-br from-accent/15 via-navy-light to-navy-light"
        : state.kind === "transferred"
          ? "border-emerald-500/35 bg-navy-light"
          : state.kind === "callback"
            ? "border-amber-400/30 bg-navy-light"
            : state.kind === "closed"
              ? "border-navy-lighter bg-navy-light/80 opacity-80"
              : "border-navy-lighter bg-navy-light";

  async function log(action: InboundLogAction, callbackLocal?: string) {
    setSaving(action);
    setError(null);
    try {
      const body: Record<string, string> = { action, note };
      if (action === "callback") {
        if (!callbackLocal) throw new Error("Pick a callback date and time.");
        body.callback_at = new Date(callbackLocal).toISOString();
      }
      const res = await fetch(patchUrl(row.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save that.");
      setNote("");
      setCallbackAt("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(patchUrl(row.id), { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not delete.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <article className={`rounded-2xl border p-5 space-y-4 ${cardTone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{row.client_name}</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            Start {formatVaDate(row.start_date)}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting || Boolean(saving)}
            aria-label={
              confirmDelete
                ? `Confirm delete ${row.client_name}`
                : `Delete ${row.client_name}`
            }
            title={confirmDelete ? "Click again to delete" : "Delete"}
            className={`p-1.5 rounded-lg disabled:opacity-50 ${
              confirmDelete
                ? "text-white bg-red-500 hover:bg-red-400"
                : "text-red-400 hover:text-red-300 hover:bg-red-500/15"
            }`}
          >
            <TrashIcon />
          </button>
        )}
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
                : state.kind === "transferred"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  : state.kind === "callback"
                    ? "bg-amber-500/15 text-amber-200 border-amber-500/40"
                    : state.kind === "closed"
                      ? "bg-navy-lighter text-gray-400 border-navy-lighter"
                      : "bg-navy text-gray-300 border-navy-lighter"
          }`}
        >
          {state.headline}
        </span>
      </div>

      <InboundCadenceTrack row={row} />

      <div className="rounded-xl bg-navy/70 border border-navy-lighter px-4 py-3">
        <p className="text-white font-medium">{state.detail}</p>
        {progress && state.dueStep && (
          <p className="text-xs text-gray-400 mt-1">
            {state.dueStep.needsCall && (
              <span className={progress.called ? "text-emerald-300" : "text-gray-400"}>
                Call {progress.called ? "done" : "needed"}
              </span>
            )}
            {state.dueStep.needsDoubleDial && (
              <>
                <span className="text-gray-600"> · </span>
                <span
                  className={
                    progress.doubleDialed ? "text-emerald-300" : "text-gray-400"
                  }
                >
                  Double dial {progress.doubleDialed ? "done" : "needed"}
                </span>
              </>
            )}
            {state.dueStep.needsVm && (
              <>
                <span className="text-gray-600"> · </span>
                <span className={progress.vm ? "text-emerald-300" : "text-gray-400"}>
                  VM #{state.dueStep.vmNumber} {progress.vm ? "done" : "needed"}
                </span>
              </>
            )}
          </p>
        )}
      </div>

      {(state.kind === "due_today" || state.kind === "overdue") && (
        <PickupScript name={row.client_name} />
      )}

      {row.attempts.length > 0 && (
        <ul className="space-y-1">
          {row.attempts.map((attempt, index) => (
            <li
              key={`${attempt.day}-${attempt.kind}-${attempt.at}-${index}`}
              className="text-xs text-gray-400"
            >
              Day {attempt.day} ·{" "}
              {attempt.kind === "vm"
                ? "Left VM"
                : attempt.kind === "spoke"
                  ? "Picked up"
                  : attempt.kind === "double_dial"
                    ? "Double dial"
                    : "Called"}{" "}
              · {formatVaTime(attempt.at)}
              {attempt.note ? ` — ${attempt.note}` : ""}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="space-y-3">
          {showCallButtons && state.dueStep && (
            <>
              <input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note (no answer, went to VM…)"
                className={inputClass}
              />
              <div className="flex flex-wrap gap-2">
                {(state.dueStep.needsDoubleDial || state.dueStep.needsVm) && (
                  <button
                    type="button"
                    disabled={Boolean(saving)}
                    onClick={() => void log("call_vm")}
                    className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
                  >
                    {saving === "call_vm"
                      ? "Saving..."
                      : state.dueStep.needsDoubleDial
                        ? "Double dialed + left VM #1"
                        : `Called + left VM #${state.dueStep.vmNumber}`}
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
                {state.dueStep.needsDoubleDial && (
                  <button
                    type="button"
                    disabled={Boolean(saving) || Boolean(progress?.doubleDialed)}
                    onClick={() => void log("double_dial")}
                    className="px-4 py-2 rounded-lg bg-navy border border-navy-lighter hover:border-accent text-white text-sm font-medium disabled:opacity-50"
                  >
                    {saving === "double_dial" ? "Saving..." : "Double dialed"}
                  </button>
                )}
                {state.dueStep.needsVm && (
                  <button
                    type="button"
                    disabled={Boolean(saving) || Boolean(progress?.vm)}
                    onClick={() => void log("vm")}
                    className="px-4 py-2 rounded-lg bg-navy border border-navy-lighter hover:border-accent text-white text-sm font-medium disabled:opacity-50"
                  >
                    {saving === "vm"
                      ? "Saving..."
                      : `Left VM #${state.dueStep.vmNumber}`}
                  </button>
                )}
                <button
                  type="button"
                  disabled={Boolean(saving)}
                  onClick={() => void log("spoke")}
                  className="px-4 py-2 rounded-lg bg-navy border border-emerald-500/40 hover:border-emerald-400 text-emerald-200 text-sm font-medium disabled:opacity-50"
                >
                  {saving === "spoke" ? "Saving..." : "They picked up"}
                </button>
              </div>
            </>
          )}

          {row.status !== "transferred" && row.status !== "closed" && (
            <div className="flex flex-wrap gap-2 items-end">
              <button
                type="button"
                disabled={Boolean(saving)}
                onClick={() => void log("transferred")}
                className="px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 disabled:opacity-50"
              >
                {saving === "transferred" ? "Saving..." : "Live transferred to Jacob"}
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={callbackAt}
                  onChange={(event) => setCallbackAt(event.target.value)}
                  className={inputClass + " w-auto"}
                />
                <button
                  type="button"
                  disabled={Boolean(saving) || !callbackAt}
                  onClick={() => void log("callback", callbackAt)}
                  className="px-4 py-2 rounded-lg bg-navy border border-amber-500/40 text-amber-200 text-sm font-medium hover:border-amber-400 disabled:opacity-50"
                >
                  {saving === "callback" ? "Saving..." : "Book callback"}
                </button>
              </div>
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

          {(row.status === "transferred" ||
            row.status === "closed" ||
            row.status === "callback") && (
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

function AddInboundForm() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [startDate, setStartDate] = useState(() =>
    nextWeekday(todayInAgencyTz())
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/va/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          phone_number: phoneNumber,
          start_date: startDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add this lead.");
      setClientName("");
      setPhoneNumber("");
      setStartDate(nextWeekday(todayInAgencyTz()));
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this lead.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-navy-light border border-navy-lighter rounded-2xl p-5 md:p-6">
      <h2 className="text-lg font-semibold text-white">Add inbound lead</h2>
      <p className="text-sm text-gray-400 mt-1 mb-4">
        Name and phone only. Start date is when the 7-weekday cadence begins. Weekends are skipped.
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
            <label className="block text-xs text-gray-400 mb-1">Start date *</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-emerald-400 text-sm">Added to the inbound list.</p>}
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add inbound lead"}
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

export default function InboundLeadTracker({
  rows,
  mode,
}: {
  rows: InboundLead[];
  mode: "va" | "crm";
}) {
  const grouped = useMemo(() => groupInboundRows(rows), [rows]);
  const patchUrl =
    mode === "va"
      ? (id: string) => `/api/va/inbound/${id}`
      : (id: string) => `/api/inbound/${id}`;
  const sampleName = grouped.dueNow[0]?.client_name ?? "Maria";

  return (
    <div className="space-y-8">
      <PickupScript name={sampleName} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
          <p className="text-2xl font-bold text-white">{grouped.dueNow.length}</p>
          <p className="text-xs text-accent mt-0.5">Need a call now</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-2xl font-bold text-white">{grouped.callbacks.length}</p>
          <p className="text-xs text-amber-200 mt-0.5">Callbacks booked</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-2xl font-bold text-white">{grouped.transferred.length}</p>
          <p className="text-xs text-emerald-300 mt-0.5">Transferred</p>
        </div>
        <div className="rounded-xl border border-navy-lighter bg-navy-light px-4 py-3">
          <p className="text-2xl font-bold text-white">{grouped.closed.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Stopped</p>
        </div>
      </div>

      <div className="rounded-2xl border border-navy-lighter bg-navy-light px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
          Inbound cadence · weekdays only (no Sat/Sun)
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {INBOUND_CADENCE.map((step) => (
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
        empty="Nobody is due for an inbound call right now."
      >
        {grouped.dueNow.map((row) => (
          <InboundCard key={row.id} row={row} canEdit patchUrl={patchUrl} />
        ))}
      </Section>

      {mode === "va" && <AddInboundForm />}

      {grouped.callbacks.length > 0 && (
        <Section
          title="Booked callbacks"
          count={grouped.callbacks.length}
          empty=""
        >
          {grouped.callbacks.map((row) => (
            <InboundCard key={row.id} row={row} canEdit patchUrl={patchUrl} />
          ))}
        </Section>
      )}

      <Section
        title="Waiting on the next cadence day"
        count={grouped.rest.length}
        empty="No one is sitting on a rest day."
      >
        {grouped.rest.map((row) => (
          <InboundCard key={row.id} row={row} canEdit patchUrl={patchUrl} />
        ))}
      </Section>

      {grouped.finished.length > 0 && (
        <Section
          title="Finished the 7-day cadence"
          count={grouped.finished.length}
          empty=""
        >
          {grouped.finished.map((row) => (
            <InboundCard key={row.id} row={row} canEdit patchUrl={patchUrl} />
          ))}
        </Section>
      )}

      {(grouped.transferred.length > 0 || grouped.closed.length > 0) && (
        <Section
          title="Closed"
          count={grouped.transferred.length + grouped.closed.length}
          empty=""
        >
          {[...grouped.transferred, ...grouped.closed].map((row) => (
            <InboundCard key={row.id} row={row} canEdit patchUrl={patchUrl} />
          ))}
        </Section>
      )}
    </div>
  );
}
