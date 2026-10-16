import { getSupabaseServer } from "@/lib/supabase/server";

/** Automatic renewals from the acquired Trexis book. Not new business policies. */
export interface TrexisBookRenewal {
  id: string;
  month_key: string;
  policy_number: string;
  renewal_date: string;
  insured_name: string;
  monthly_premium: number;
  commission_rate: number;
  commission_amount: number;
  annual_written_premium: number;
  paid_in_full: boolean;
}

export interface TrexisRenewalMonth {
  monthKey: string;
  renewals: TrexisBookRenewal[];
  policyCount: number;
  annualPremium: number;
  commission: number;
}

function asNumber(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function mapRenewal(row: Record<string, unknown>): TrexisBookRenewal {
  return {
    id: String(row.id),
    month_key: String(row.month_key),
    policy_number: String(row.policy_number),
    renewal_date: String(row.renewal_date).slice(0, 10),
    insured_name: String(row.insured_name),
    monthly_premium: asNumber(row.monthly_premium),
    commission_rate: asNumber(row.commission_rate),
    commission_amount: asNumber(row.commission_amount),
    annual_written_premium: asNumber(row.annual_written_premium),
    paid_in_full: Boolean(row.paid_in_full),
  };
}

export async function fetchTrexisBookRenewals(): Promise<{
  renewals: TrexisBookRenewal[];
  error: string | null;
}> {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("trexis_book_renewals")
      .select("*")
      .order("renewal_date", { ascending: true })
      .order("insured_name", { ascending: true });

    if (error) return { renewals: [], error: error.message };

    return {
      renewals: (data ?? []).map((row) =>
        mapRenewal(row as Record<string, unknown>)
      ),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { renewals: [], error: message };
  }
}

export function summarizeTrexisRenewals(
  renewals: TrexisBookRenewal[],
  monthKey: string
): TrexisRenewalMonth {
  const monthRenewals = renewals.filter((row) => row.month_key === monthKey);
  let annualPremium = 0;
  let commission = 0;

  for (const renewal of monthRenewals) {
    annualPremium += renewal.annual_written_premium;
    commission += renewal.commission_amount;
  }

  return {
    monthKey,
    renewals: monthRenewals,
    policyCount: monthRenewals.length,
    annualPremium,
    commission,
  };
}

export function listTrexisRenewalMonths(renewals: TrexisBookRenewal[]): string[] {
  return Array.from(new Set(renewals.map((row) => row.month_key))).sort((a, b) =>
    b.localeCompare(a)
  );
}
