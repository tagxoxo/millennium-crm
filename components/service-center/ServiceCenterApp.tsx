"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CarrierBadge from "@/components/ui/CarrierBadge";
import KpiCard from "@/components/ui/KpiCard";
import type { ContactType, OutreachStatus } from "@/lib/types";
import {
  daysSinceContact,
  exportActivitiesCsv,
  getPolicyReviewResponses,
  getRenewalOutcomeColor,
  isNonPayAlertResolved,
  OUTREACH_TYPE_LABELS,
  outreachLanguage,
  type OutreachActivity,
  type ServiceCenterStats,
} from "@/lib/serviceCenter";
import { formatContactDateTime } from "@/lib/renewalReminders";
import { daysUntilRenewal } from "@/lib/utils";
import { STAGE_LABELS } from "@/lib/types";

type TabId = "all" | "non_pay" | "renewals" | "reviews";
type DateRange = "today" | "7" | "30" | "custom";
type TypeFilter = "all" | "non_pay" | "renewal" | "review";
type LanguageFilter = "all" | "english" | "spanish";

interface ServiceCenterAppProps {
  activities: OutreachActivity[];
  stats: ServiceCenterStats;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All Activity" },
  { id: "non_pay", label: "Non-Pay Alerts" },
  { id: "renewals", label: "Renewal Reminders" },
  { id: "reviews", label: "Policy Reviews" },
];

const EMPTY_STATES: Record<TabId, { icon: string; message: string }> = {
  all: { icon: "📭", message: "No outreach activity yet" },
  non_pay: { icon: "💳", message: "No non-pay alerts sent yet" },
  renewals: { icon: "📅", message: "No renewal reminders sent yet" },
  reviews: { icon: "📋", message: "No policy reviews sent yet" },
};

function statusBadgeClass(status: OutreachStatus): string {
  if (status === "sent") return "bg-green-500/20 text-green-400 border-green-500/40";
  if (status === "failed") return "bg-red-500/20 text-red-400 border-red-500/40";
  return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
}

function statusLabel(status: OutreachStatus): string {
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  return "Pending";
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function matchesDateRange(
  contactDate: string,
  range: DateRange,
  customFrom: string,
  customTo: string
): boolean {
  const date = new Date(contactDate);
  const today = startOfToday();

  if (range === "today") {
    return date >= today;
  }
  if (range === "7") {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 7);
    return date >= cutoff;
  }
  if (range === "30") {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 30);
    return date >= cutoff;
  }
  if (customFrom) {
    const from = new Date(customFrom);
    from.setHours(0, 0, 0, 0);
    if (date < from) return false;
  }
  if (customTo) {
    const to = new Date(customTo);
    to.setHours(23, 59, 59, 999);
    if (date > to) return false;
  }
  return true;
}

function matchesTypeFilter(type: ContactType, filter: TypeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "non_pay") {
    return type === "non_pay_alert" || type === "non_pay_resolved";
  }
  if (filter === "renewal") return type === "renewal_reminder_45";
  return (
    type === "manual_policy_review" || type === "policy_review_response"
  );
}

function matchesLanguageFilter(
  activity: OutreachActivity,
  filter: LanguageFilter
): boolean {
  if (filter === "all") return true;
  const lang = outreachLanguage(activity);
  if (filter === "spanish") return lang === "Spanish";
  return lang === "English";
}

function filterActivities(
  activities: OutreachActivity[],
  tab: TabId,
  search: string,
  dateRange: DateRange,
  customFrom: string,
  customTo: string,
  typeFilter: TypeFilter,
  languageFilter: LanguageFilter
): OutreachActivity[] {
  let list = activities;

  if (tab === "non_pay") {
    list = list.filter((a) => a.contact_type === "non_pay_alert");
  } else if (tab === "renewals") {
    list = list.filter((a) => a.contact_type === "renewal_reminder_45");
  } else if (tab === "reviews") {
    list = list.filter((a) => a.contact_type === "manual_policy_review");
  }

  const q = search.trim().toLowerCase();
  return list.filter((a) => {
    if (!matchesDateRange(a.contact_date, dateRange, customFrom, customTo)) {
      return false;
    }
    if (tab === "all" && !matchesTypeFilter(a.contact_type, typeFilter)) {
      return false;
    }
    if (!matchesLanguageFilter(a, languageFilter)) return false;
    if (!q) return true;
    return (
      a.client_name.toLowerCase().includes(q) ||
      (a.policy_number?.toLowerCase().includes(q) ?? false)
    );
  });
}

function EmptyState({ tab }: { tab: TabId }) {
  const { icon, message } = EMPTY_STATES[tab];
  return (
    <div className="bg-navy-light border border-navy-lighter rounded-xl p-12 text-center">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-gray-400">{message}</p>
    </div>
  );
}

function LogResponseModal({
  activity,
  onClose,
  onSaved,
}: {
  activity: OutreachActivity;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/service-center/policy-review/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy_id: activity.policy_id,
          response,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-navy-light border border-navy-lighter rounded-xl p-5 space-y-4"
      >
        <h3 className="text-sm font-semibold text-white">
          Log client response — {activity.client_name}
        </h3>
        <textarea
          required
          rows={4}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="What did the client say when they replied?"
          className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm resize-none"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Response"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ServiceCenterApp({
  activities,
  stats,
}: ServiceCenterAppProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>("all");
  const [actionId, setActionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [logResponseFor, setLogResponseFor] = useState<OutreachActivity | null>(
    null
  );

  const filtered = useMemo(
    () =>
      filterActivities(
        activities,
        tab,
        search,
        dateRange,
        customFrom,
        customTo,
        typeFilter,
        languageFilter
      ),
    [
      activities,
      tab,
      search,
      dateRange,
      customFrom,
      customTo,
      typeFilter,
      languageFilter,
    ]
  );

  function handleExport() {
    const csv = exportActivitiesCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `service-center-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function sendNonPayAgain(policyId: string) {
    setActionId(policyId);
    try {
      const res = await fetch("/api/send-nonpay-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_id: policyId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setActionId(null);
    }
  }

  async function resolveNonPay(policyId: string) {
    setActionId(policyId);
    try {
      const res = await fetch("/api/service-center/non-pay/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_id: policyId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed.");
    } finally {
      setActionId(null);
    }
  }

  async function deleteActivity(activity: OutreachActivity) {
    const label = OUTREACH_TYPE_LABELS[activity.contact_type];
    const confirmed = window.confirm(
      `Delete this ${label} for ${activity.client_name}?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(activity.id);
    try {
      const res = await fetch(`/api/service-center/activity/${activity.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  function DeleteButton({ activity }: { activity: OutreachActivity }) {
    return (
      <button
        type="button"
        disabled={deletingId === activity.id}
        onClick={() => deleteActivity(activity)}
        className="text-xs px-2 py-1 border border-red-500/40 rounded text-red-400 hover:bg-red-500/10 disabled:opacity-50"
      >
        {deletingId === activity.id ? "Deleting..." : "Delete"}
      </button>
    );
  }

  const selectClass =
    "px-3 py-2 bg-navy-light border border-navy-lighter rounded-lg text-white text-sm focus:outline-none focus:border-accent";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Service Center
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Track non-pay alerts, renewal reminders, policy reviews, and all
            client outreach
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="shrink-0 px-4 py-2.5 border border-navy-lighter text-gray-300 hover:text-white hover:border-accent/50 text-sm font-medium rounded-lg transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Total Outreach (Last 30 Days)"
          value={stats.totalLast30Days.toLocaleString()}
        />
        <KpiCard
          label="Non-Pay Alerts Sent"
          value={stats.nonPayAlerts30.toLocaleString()}
          subtext="Last 30 days"
        />
        <KpiCard
          label="Renewal Reminders Sent"
          value={stats.renewalReminders30.toLocaleString()}
          subtext="Last 30 days"
        />
        <KpiCard
          label="Resolved Non-Pay"
          value={stats.resolvedNonPay30.toLocaleString()}
          subtext="Last 30 days"
        />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-navy-lighter">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-accent text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search client name or policy #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2.5 bg-navy-light border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm"
        />
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          className={selectClass}
        >
          <option value="today">Today</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="custom">Custom range</option>
        </select>
        {dateRange === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className={selectClass}
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className={selectClass}
            />
          </>
        )}
        {tab === "all" && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className={selectClass}
          >
            <option value="all">All types</option>
            <option value="non_pay">Non-pay</option>
            <option value="renewal">Renewal</option>
            <option value="review">Review</option>
          </select>
        )}
        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value as LanguageFilter)}
          className={selectClass}
        >
          <option value="all">All languages</option>
          <option value="english">English</option>
          <option value="spanish">Spanish</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="bg-navy-light border border-navy-lighter rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-lighter text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Carrier</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Language</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {tab === "non_pay" && (
                    <>
                      <th className="px-4 py-3 font-medium">Days Since</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </>
                  )}
                  {tab === "renewals" && (
                    <>
                      <th className="px-4 py-3 font-medium">Days to Renewal</th>
                      <th className="px-4 py-3 font-medium">Outcome</th>
                    </>
                  )}
                  {tab === "reviews" && (
                    <>
                      <th className="px-4 py-3 font-medium">Client Response</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </>
                  )}
                  {tab === "all" && (
                    <th className="px-4 py-3 font-medium">Details</th>
                  )}
                  {(tab === "all" || tab === "renewals") && (
                    <th className="px-4 py-3 font-medium w-20"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((activity) => {
                  const resolved = isNonPayAlertResolved(activity, activities);
                  const nonPayRowClass =
                    tab === "non_pay"
                      ? resolved
                        ? "bg-green-500/5"
                        : activity.stage !== "lapsed"
                          ? "bg-red-500/5"
                          : ""
                      : "";

                  const renewalColor =
                    tab === "renewals"
                      ? getRenewalOutcomeColor(activity)
                      : null;
                  const renewalRowClass =
                    renewalColor === "green"
                      ? "bg-green-500/5"
                      : renewalColor === "red"
                        ? "bg-red-500/5"
                        : renewalColor === "yellow"
                          ? "bg-yellow-500/5"
                          : "";

                  const responses =
                    tab === "reviews"
                      ? getPolicyReviewResponses(activity, activities)
                      : [];

                  return (
                    <tr
                      key={activity.id}
                      className={`border-b border-navy-lighter/50 hover:bg-navy/30 align-top ${nonPayRowClass}${renewalRowClass}`}
                    >
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {formatContactDateTime(activity.contact_date)}
                      </td>
                      <td className="px-4 py-3">
                        {activity.client_id ? (
                          <Link
                            href={`/clients/${activity.client_id}`}
                            className="text-white font-medium hover:text-accent"
                          >
                            {activity.client_name}
                          </Link>
                        ) : (
                          <span className="text-white font-medium">
                            {activity.client_name}
                          </span>
                        )}
                        {activity.policy_number && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            #{activity.policy_number}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <CarrierBadge carrier={activity.carrier} />
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {OUTREACH_TYPE_LABELS[activity.contact_type]}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {outreachLanguage(activity)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${statusBadgeClass(activity.status)}`}
                        >
                          {statusLabel(activity.status)}
                        </span>
                      </td>

                      {tab === "non_pay" && (
                        <>
                          <td className="px-4 py-3 text-gray-300">
                            {daysSinceContact(activity.contact_date)}d
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {!resolved && activity.stage !== "lapsed" && (
                                <>
                                  <button
                                    type="button"
                                    disabled={actionId === activity.policy_id}
                                    onClick={() =>
                                      sendNonPayAgain(activity.policy_id)
                                    }
                                    className="text-xs px-2 py-1 border border-navy-lighter rounded text-accent hover:bg-navy disabled:opacity-50"
                                  >
                                    Send Again
                                  </button>
                                  <button
                                    type="button"
                                    disabled={actionId === activity.policy_id}
                                    onClick={() =>
                                      resolveNonPay(activity.policy_id)
                                    }
                                    className="text-xs px-2 py-1 border border-green-500/40 rounded text-green-400 hover:bg-green-500/10 disabled:opacity-50"
                                  >
                                    Resolved
                                  </button>
                                </>
                              )}
                              {resolved && (
                                <span className="text-xs text-green-400">
                                  Resolved
                                </span>
                              )}
                              <DeleteButton activity={activity} />
                            </div>
                          </td>
                        </>
                      )}

                      {tab === "renewals" && (
                        <>
                          <td className="px-4 py-3 text-gray-300">
                            {daysUntilRenewal(activity.renewal_date)}d
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium ${
                                renewalColor === "green"
                                  ? "text-green-400"
                                  : renewalColor === "red"
                                    ? "text-red-400"
                                    : "text-yellow-400"
                              }`}
                            >
                              {activity.stage === "retained"
                                ? "Retained"
                                : activity.stage === "lapsed"
                                  ? "Lapsed"
                                  : "Pending"}
                              {" · "}
                              {STAGE_LABELS[activity.stage]}
                            </span>
                          </td>
                        </>
                      )}

                      {tab === "reviews" && (
                        <>
                          <td className="px-4 py-3 text-gray-400 max-w-xs">
                            {responses.length > 0 ? (
                              responses.map((r) => (
                                <p key={r.id} className="text-sm mb-1 whitespace-pre-wrap">
                                  {r.notes}
                                </p>
                              ))
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setLogResponseFor(activity)}
                                className="text-xs px-2 py-1 border border-navy-lighter rounded text-accent hover:bg-navy"
                              >
                                Log Response
                              </button>
                              <DeleteButton activity={activity} />
                            </div>
                          </td>
                        </>
                      )}

                      {tab === "all" && (
                        <td className="px-4 py-3 text-gray-400 max-w-xs">
                          {activity.notes || activity.outcome || "—"}
                          <Link
                            href={`/policies/${activity.policy_id}`}
                            className="block text-xs text-accent hover:underline mt-1"
                          >
                            View policy
                          </Link>
                        </td>
                      )}

                      <td className="px-4 py-3">
                        {tab !== "non_pay" && tab !== "reviews" && (
                          <DeleteButton activity={activity} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {logResponseFor && (
        <LogResponseModal
          activity={logResponseFor}
          onClose={() => setLogResponseFor(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
