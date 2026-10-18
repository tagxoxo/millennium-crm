export type VaScriptTab = "greeting" | "info" | "payment" | "policy" | "quote";

export type VaIntakeAnswer = {
  label: string;
  answer: string;
};

export type VaScriptItem = {
  key: string;
  label: string;
  say: string;
  choices?: string[];
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

const YES_NO = ["Yes", "No"];

export const VA_QUOTE_SCRIPT_ITEMS: VaScriptItem[] = [
  { key: "full_name", label: "Name", say: "Can I start with your name?" },
  { key: "address", label: "Address", say: "And your current address?" },
  { key: "date_of_birth", label: "DOB", say: "What's your date of birth?" },
  { key: "gender", label: "Gender", say: "And your gender?" },
  {
    key: "drivers_license",
    label: "Drivers license #",
    say: "What's your driver's license number?",
  },
  {
    key: "vehicle_vin",
    label: "VIN",
    say: "What's the VIN for the vehicle you'd like to insure?",
  },
  {
    key: "coverage_type",
    label: "Liability or full coverage",
    say: "Do you want liability or full coverage?",
    choices: ["Liability", "Full coverage"],
  },
  {
    key: "prior_insurance",
    label: "Prior Insurance",
    say: "Do you have prior insurance?",
    choices: YES_NO,
  },
  {
    key: "homeowner",
    label: "Homeowner",
    say: "Are you a homeowner?",
    choices: YES_NO,
  },
  {
    key: "additional_drivers",
    label: "Additional drivers",
    say: "Are there any additional drivers? If so, I'll need their names and dates of birth.",
  },
  {
    key: "excluded_drivers",
    label: "Excluded Drivers",
    say: "Anyone in the household who will be excluded from driving? I'll need their names and dates of birth.",
  },
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
