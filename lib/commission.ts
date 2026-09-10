import type { Carrier, Policy } from "./types";
import { CARRIERS } from "./types";
import { annualizedPremium } from "./utils";

/** Fallback when a carrier has no specific rate configured. */
export const DEFAULT_COMMISSION_RATE = 0.12;

/** Annual commission rate by carrier (decimal, e.g. 0.13 = 13%). */
export const CARRIER_COMMISSION_RATES: Record<Carrier, number> = {
  trexis: 0.13,
  progressive: 0.1,
  gainsco: DEFAULT_COMMISSION_RATE,
  foremost: DEFAULT_COMMISSION_RATE,
  safeco: DEFAULT_COMMISSION_RATE,
  safeway: 0.15,
  national_general: DEFAULT_COMMISSION_RATE,
  bristol_west: DEFAULT_COMMISSION_RATE,
  geico: 0.07,
  liberty_mutual_bop: DEFAULT_COMMISSION_RATE,
  liberty_mutual_surety_bond: DEFAULT_COMMISSION_RATE,
  tapco: DEFAULT_COMMISSION_RATE,
  cna: DEFAULT_COMMISSION_RATE,
  bruce_messier: 0.05,
  mesa: 0.11,
  acceptance_independent: 0.14,
};

export function getCarrierCommissionRate(carrier: Carrier): number {
  return CARRIER_COMMISSION_RATES[carrier] ?? DEFAULT_COMMISSION_RATE;
}

export function formatCommissionRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

export function estimateAnnualCommission(
  premium: number,
  termMonths: Policy["term_months"],
  carrier: Carrier
): number {
  const annualPremium = annualizedPremium(premium, termMonths);
  return annualPremium * getCarrierCommissionRate(carrier);
}

export function estimateMonthlyCommission(
  premium: number,
  termMonths: Policy["term_months"],
  carrier: Carrier
): number {
  return estimateAnnualCommission(premium, termMonths, carrier) / 12;
}

export function estimateBookMonthlyCommission(policies: Policy[]): number {
  return policies.reduce((sum, policy) => {
    return (
      sum +
      estimateMonthlyCommission(
        Number(policy.premium),
        policy.term_months,
        policy.carrier
      )
    );
  }, 0);
}

export function listConfiguredCarrierRates(): {
  carrier: Carrier;
  rate: number;
}[] {
  return CARRIERS.map((carrier) => ({
    carrier,
    rate: getCarrierCommissionRate(carrier),
  }));
}
