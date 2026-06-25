import type { ExtractedPolicyInfo } from "@/lib/extractPolicyInfo";

export type ExtractConflictField =
  | "policy_number"
  | "client_address"
  | "client_email"
  | "client_phone";

const FIELD_MAP: Record<
  ExtractConflictField,
  "policy_number" | "client_address" | "email" | "phone"
> = {
  policy_number: "policy_number",
  client_address: "client_address",
  client_email: "email",
  client_phone: "phone",
};

export interface ExtractPolicyValues {
  policy_number: string | null;
  client_address: string | null;
  email: string | null;
  phone: string | null;
}

export function getExtractConflicts(
  extracted: Pick<ExtractedPolicyInfo, ExtractConflictField>,
  policy: ExtractPolicyValues
): ExtractConflictField[] {
  const conflicts: ExtractConflictField[] = [];

  for (const field of Object.keys(FIELD_MAP) as ExtractConflictField[]) {
    const incoming = extracted[field]?.trim();
    if (!incoming) continue;

    const existing = policy[FIELD_MAP[field]]?.trim();
    if (existing && existing !== incoming) {
      conflicts.push(field);
    }
  }

  return conflicts;
}

export function canAutoApplyExtracted(
  extracted: Pick<ExtractedPolicyInfo, ExtractConflictField>,
  policy: ExtractPolicyValues
): boolean {
  const hasIncoming = (Object.keys(FIELD_MAP) as ExtractConflictField[]).some(
    (field) => extracted[field]?.trim()
  );
  if (!hasIncoming) return false;
  return getExtractConflicts(extracted, policy).length === 0;
}
