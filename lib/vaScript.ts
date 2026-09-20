export type VaScriptTab = "greeting" | "payment" | "policy" | "quote";

export type VaIntakeAnswer = {
  label: string;
  answer: string;
};

export type VaScriptItem = {
  key: string;
  label: string;
  say: string;
};

export const VA_POLICY_SCRIPT_ITEMS: VaScriptItem[] = [
  { key: "carrier", label: "Carrier", say: "Who is your insurance carrier?" },
  { key: "full_name", label: "Full name", say: "Can I get your full name please?" },
  { key: "policy_number", label: "Policy number", say: "And your policy number?" },
  { key: "phone_number", label: "Phone number", say: "What's the best phone number for you?" },
  { key: "email", label: "Email", say: "What's the best email to send your change summary to?" },
  {
    key: "requested_change",
    label: "Requested change",
    say: "What change would you like to make to your policy today?",
  },
];

export const VA_QUOTE_SCRIPT_ITEMS: VaScriptItem[] = [
  { key: "full_name", label: "Full name", say: "Can I start with your full name?" },
  { key: "address", label: "Address", say: "And your current address?" },
  { key: "phone_number", label: "Phone number", say: "Best phone number to reach you?" },
  { key: "date_of_birth", label: "Date of birth", say: "What's your date of birth?" },
  {
    key: "drivers_license",
    label: "Driver's license number",
    say: "And your driver's license number?",
  },
  { key: "marital_status", label: "Marital status", say: "Are you single or married?" },
  {
    key: "additional_drivers",
    label: "Additional drivers",
    say: "Are there any additional drivers in the household? If so, I'll need their names and dates of birth.",
  },
  {
    key: "excluded_drivers",
    label: "Excluded drivers",
    say: "Anyone in the household 15 or older who will NOT be driving? I'll need their names and dates of birth as well.",
  },
  {
    key: "vehicle_vin",
    label: "Vehicle VIN",
    say: "Do you have the VIN number for the vehicle you'd like to insure?",
  },
  {
    key: "prior_insurance",
    label: "Prior insurance",
    say: "Do you currently have or have you had auto insurance in the past?",
  },
  { key: "homeowner", label: "Homeowner", say: "Are you a homeowner or do you rent?" },
];

export function emptyScriptAnswers(items: VaScriptItem[]): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const item of items) answers[item.key] = "";
  return answers;
}

export function answersFromRecord(
  items: VaScriptItem[],
  values: Record<string, string>
): VaIntakeAnswer[] {
  return items
    .map((item) => ({
      label: item.label,
      answer: (values[item.key] ?? "").trim(),
    }))
    .filter((row) => row.answer.length > 0);
}

export function parseIntakeAnswers(raw: unknown): VaIntakeAnswer[] {
  if (!Array.isArray(raw)) return [];
  const answers: VaIntakeAnswer[] = [];
  for (const row of raw.slice(0, 24)) {
    if (!row || typeof row !== "object") continue;
    const label = String((row as { label?: unknown }).label ?? "").trim();
    const answer = String((row as { answer?: unknown }).answer ?? "").trim();
    if (!label || !answer) continue;
    answers.push({
      label: label.slice(0, 80),
      answer: answer.slice(0, 4000),
    });
  }
  return answers;
}
