import type { Lead, Policy } from "./types";
import {
  computeServiceCenterStats,
  isNonPayAlertResolved,
  type OutreachActivity,
} from "./serviceCenter";
import { URGENT_RENEWAL_DAYS } from "./dashboard";
import { getRenewalEmailStatus } from "./renewalReminders";
import { formatCurrency, parseLocalDate } from "./utils";

export interface RetentionHubSummary {
  renewalsNext30: number;
  stillUpcoming: number;
  alreadyContacted: number;
  premiumAtRisk: number;
  remindersNeeded: number;
}

export interface ServiceHubSummary {
  openNonPayAlerts: number;
  outreachLast30Days: number;
  renewalRemindersSent30: number;
}

export interface SalesHubSummary {
  activeLeads: number;
  quotedLeads: number;
  newLeads: number;
}

export interface BookHealthSummary {
  missingEmail: number;
  missingPhone: number;
  spanishPolicies: number;
}

export interface DashboardHubData {
  retention: RetentionHubSummary;
  service: ServiceHubSummary;
  sales: SalesHubSummary;
  bookHealth: BookHealthSummary;
}

function renewingInWindow(policies: Policy[], days: number): Policy[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + days);

  return policies.filter((policy) => {
    if (policy.stage === "lapsed") return false;
    const renewal = parseLocalDate(policy.renewal_date);
    renewal.setHours(0, 0, 0, 0);
    return renewal >= today && renewal <= end;
  });
}

export function computeRetentionHubSummary(
  policies: Policy[],
  recentReminderPolicyIds: Set<string>
): RetentionHubSummary {
  const renewing = renewingInWindow(policies, URGENT_RENEWAL_DAYS);
  const stillUpcoming = renewing.filter((p) => p.stage === "upcoming").length;
  const alreadyContacted = renewing.filter((p) =>
    ["contacted", "quoted", "retained"].includes(p.stage)
  ).length;
  const premiumAtRisk = renewing.reduce((sum, p) => sum + (Number(p.premium) || 0), 0);
  const remindersNeeded = policies.filter(
    (p) => getRenewalEmailStatus(p, recentReminderPolicyIds) === "needed"
  ).length;

  return {
    renewalsNext30: renewing.length,
    stillUpcoming,
    alreadyContacted,
    premiumAtRisk,
    remindersNeeded,
  };
}

export function computeServiceHubSummary(
  activities: OutreachActivity[]
): ServiceHubSummary {
  const stats = computeServiceCenterStats(activities);
  const openNonPayAlerts = activities.filter(
    (activity) =>
      activity.contact_type === "non_pay_alert" &&
      !isNonPayAlertResolved(activity, activities)
  ).length;

  return {
    openNonPayAlerts,
    outreachLast30Days: stats.totalLast30Days,
    renewalRemindersSent30: stats.renewalReminders30,
  };
}

export function computeSalesHubSummary(leads: Lead[]): SalesHubSummary {
  const active = leads.filter((lead) => lead.stage !== "sold");

  return {
    activeLeads: active.length,
    quotedLeads: active.filter((lead) => lead.stage === "quoted").length,
    newLeads: active.filter((lead) => lead.stage === "new").length,
  };
}

export function computeBookHealthSummary(policies: Policy[]): BookHealthSummary {
  const active = policies.filter((p) => p.stage !== "lapsed");

  return {
    missingEmail: active.filter((p) => !p.email?.trim()).length,
    missingPhone: active.filter((p) => !p.phone?.trim()).length,
    spanishPolicies: active.filter((p) => p.spanish_speaker).length,
  };
}

export function computeDashboardHubData(
  policies: Policy[],
  activities: OutreachActivity[],
  leads: Lead[],
  recentReminderPolicyIds: string[]
): DashboardHubData {
  const reminderSet = new Set(recentReminderPolicyIds);

  return {
    retention: computeRetentionHubSummary(policies, reminderSet),
    service: computeServiceHubSummary(activities),
    sales: computeSalesHubSummary(leads),
    bookHealth: computeBookHealthSummary(policies),
  };
}

export interface FocusAlert {
  message: string;
  href: string;
  urgent: boolean;
}

export function buildFocusAlerts(hub: DashboardHubData): FocusAlert[] {
  const alerts: FocusAlert[] = [];

  if (hub.service.openNonPayAlerts > 0) {
    alerts.push({
      message: `${hub.service.openNonPayAlerts} open non-pay alert${
        hub.service.openNonPayAlerts === 1 ? "" : "s"
      } need attention`,
      href: "/service-center",
      urgent: true,
    });
  }

  if (hub.retention.stillUpcoming > 0) {
    alerts.push({
      message: `${hub.retention.stillUpcoming} renewal${
        hub.retention.stillUpcoming === 1 ? "" : "s"
      } in 30 days still in Upcoming — not contacted yet`,
      href: "/retention",
      urgent: hub.retention.stillUpcoming >= 3,
    });
  }

  if (hub.retention.remindersNeeded > 0) {
    alerts.push({
      message: `${hub.retention.remindersNeeded} polic${
        hub.retention.remindersNeeded === 1 ? "y needs" : "ies need"
      } a 45-day renewal reminder email`,
      href: "/retention",
      urgent: false,
    });
  }

  if (hub.sales.newLeads > 0) {
    alerts.push({
      message: `${hub.sales.newLeads} new lead${
        hub.sales.newLeads === 1 ? "" : "s"
      } waiting for first contact`,
      href: "/sales-center",
      urgent: false,
    });
  }

  if (hub.bookHealth.missingEmail > 0) {
    alerts.push({
      message: `${hub.bookHealth.missingEmail} active polic${
        hub.bookHealth.missingEmail === 1 ? "y has" : "ies have"
      } no email on file`,
      href: "/policies",
      urgent: false,
    });
  }

  return alerts.slice(0, 4);
}

export { formatCurrency };
