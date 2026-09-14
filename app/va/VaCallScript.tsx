"use client";

import { useState, type ReactNode } from "react";

type ScriptTab = "greeting" | "payment" | "policy" | "quote";
type PaymentCarrier = "trexis" | "progressive";

const TABS: { id: ScriptTab; label: string }[] = [
  { id: "greeting", label: "Greeting" },
  { id: "payment", label: "Payment" },
  { id: "policy", label: "Policy Change" },
  { id: "quote", label: "New Quote" },
];

const POLICY_ITEMS = [
  { label: "Carrier", say: "Who is your insurance carrier?" },
  { label: "Full name", say: "Can I get your full name please?" },
  { label: "Policy number", say: "And your policy number?" },
  { label: "Phone number", say: "What's the best phone number for you?" },
  { label: "Requested change", say: "What change would you like to make to your policy today?" },
];

const QUOTE_ITEMS = [
  { label: "Full name", say: "Can I start with your full name?" },
  { label: "Address", say: "And your current address?" },
  { label: "Phone number", say: "Best phone number to reach you?" },
  { label: "Date of birth", say: "What's your date of birth?" },
  { label: "Driver's license number", say: "And your driver's license number?" },
  { label: "Marital status", say: "Are you single or married?" },
  {
    label: "Additional drivers",
    say: "Are there any additional drivers in the household? If so, I'll need their names and dates of birth.",
  },
  {
    label: "Excluded drivers",
    say: "Anyone in the household 15 or older who will NOT be driving? I'll need their names and dates of birth as well.",
  },
  { label: "Vehicle VIN", say: "Do you have the VIN number for the vehicle you'd like to insure?" },
  { label: "Prior insurance", say: "Do you currently have or have you had auto insurance in the past?" },
  { label: "Homeowner", say: "Are you a homeowner or do you rent?" },
];

function Line({ children }: { children: ReactNode }) {
  return <p className="text-white font-semibold leading-relaxed text-sm">{children}</p>;
}

function Cue({ children }: { children: ReactNode }) {
  return <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{children}</p>;
}

function CopyNumber({ number }: { number: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <p className="text-2xl font-bold text-white tracking-wide tabular-nums">{number}</p>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 px-2 py-1 rounded-md border border-navy-lighter bg-navy text-[11px] text-gray-300 hover:text-white hover:border-accent"
      >
        {copied ? "Copied" : "Copy number"}
      </button>
    </div>
  );
}

function Checklist({
  items,
  checked,
  onToggle,
}: {
  items: { label: string; say: string }[];
  checked: boolean[];
  onToggle: (index: number) => void;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => {
        const on = checked[index];
        return (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => onToggle(index)}
              className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                on
                  ? "border-green-500/40 bg-green-500/10"
                  : "border-navy-lighter bg-navy hover:border-accent"
              }`}
            >
              <span className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                    on
                      ? "border-green-400 bg-green-500 text-white"
                      : "border-gray-500 bg-navy-light"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                <span>
                  <span className={`block text-sm font-semibold ${on ? "text-green-300" : "text-white"}`}>
                    {item.label}
                  </span>
                  <span className={`block text-xs mt-0.5 leading-relaxed font-semibold ${on ? "text-green-200/90" : "text-white"}`}>
                    &ldquo;{item.say}&rdquo;
                  </span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function GreetingScript() {
  return (
    <div className="space-y-4">
      <Cue>Answer the phone:</Cue>
      <Line>
        &ldquo;Thank you for calling Millennium Insurance — this is [your name]. How can I help you
        today?&rdquo;
      </Line>
      <p className="text-gray-400 text-sm italic leading-relaxed">
        Listen for what the caller needs, then click the matching tab above.
      </p>
    </div>
  );
}

function PaymentScript({
  carrier,
  onSelect,
}: {
  carrier: PaymentCarrier | null;
  onSelect: (value: PaymentCarrier) => void;
}) {
  return (
    <div className="space-y-4">
      <Cue>Ask:</Cue>
      <Line>&ldquo;Of course! Who is your insurance carrier?&rdquo;</Line>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSelect("trexis")}
          className={`py-4 rounded-lg text-sm font-semibold border transition-colors ${
            carrier === "trexis"
              ? "bg-accent text-white border-accent"
              : "bg-navy text-gray-200 border-navy-lighter hover:border-accent hover:text-white"
          }`}
        >
          Trexis
        </button>
        <button
          type="button"
          onClick={() => onSelect("progressive")}
          className={`py-4 rounded-lg text-sm font-semibold border transition-colors ${
            carrier === "progressive"
              ? "bg-accent text-white border-accent"
              : "bg-navy text-gray-200 border-navy-lighter hover:border-accent hover:text-white"
          }`}
        >
          Progressive
        </button>
      </div>

      {carrier === "trexis" && (
        <div className="space-y-3 pt-1">
          <Line>
            &ldquo;Great, I&apos;m going to give you the number to call Trexis directly to process your
            payment. Are you ready?&rdquo;
          </Line>
          <CopyNumber number="877-784-7466" />
          <Line>&ldquo;Is there anything else I can help you with today?&rdquo;</Line>
        </div>
      )}

      {carrier === "progressive" && (
        <div className="space-y-3 pt-1">
          <Line>
            &ldquo;Sure! I&apos;ll give you Progressive&apos;s payment line right now. Are you ready?&rdquo;
          </Line>
          <CopyNumber number="1-855-347-3939" />
          <Line>&ldquo;Is there anything else I can help you with today?&rdquo;</Line>
        </div>
      )}
    </div>
  );
}

function PolicyScript({
  checked,
  onToggle,
}: {
  checked: boolean[];
  onToggle: (index: number) => void;
}) {
  const ready = checked.every(Boolean);

  return (
    <div className="space-y-4">
      <Cue>Say:</Cue>
      <Line>
        &ldquo;Absolutely, I can submit that change request for you. Let me grab a few details.&rdquo;
      </Line>

      <Cue>Collect the following — check each off as you go:</Cue>
      <Checklist items={POLICY_ITEMS} checked={checked} onToggle={onToggle} />

      {ready && (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/40 rounded-lg px-3 py-2.5">
            <p className="text-green-300 text-sm font-medium leading-relaxed">
              Ready to submit — fill out the New Request form on the left, then follow the steps below.
            </p>
          </div>
          <Cue>Post-submission steps</Cue>
          <ol className="space-y-2 text-sm text-gray-200 list-decimal pl-4">
            <li>Email the insured a summary of their requested change</li>
            <li>
              Tell them:{" "}
              <span className="text-white font-semibold">
                &ldquo;You&apos;ll receive an email summarizing your request. Please reply back with
                &apos;I confirm this endorsement&apos; so we can process it.&rdquo;
              </span>
            </li>
            <li className="text-yellow-300 font-medium">
              ⚠️ Do not process the endorsement until written confirmation is received.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

function QuoteScript({
  checked,
  onToggle,
}: {
  checked: boolean[];
  onToggle: (index: number) => void;
}) {
  const ready = checked.every(Boolean);

  return (
    <div className="space-y-4">
      <Cue>Say:</Cue>
      <Line>
        &ldquo;I&apos;d love to help you get a quote! Let me pull up some information — this will just
        take a couple minutes.&rdquo;
      </Line>

      <Cue>Collect the following in order — check each off as you go:</Cue>
      <Checklist items={QUOTE_ITEMS} checked={checked} onToggle={onToggle} />

      {ready && (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/40 rounded-lg px-3 py-2.5">
            <p className="text-green-300 text-sm font-medium leading-relaxed">
              Ready to submit — fill in the New Request form and select &apos;New Quote&apos; as the
              request type.
            </p>
          </div>
          <Cue>Say:</Cue>
          <Line>
            &ldquo;Perfect, I&apos;ve got everything I need. We&apos;ll get that quote put together and
            follow up with you shortly. Is there anything else I can help you with today?&rdquo;
          </Line>
        </div>
      )}
    </div>
  );
}

export default function VaCallScript() {
  const [tab, setTab] = useState<ScriptTab>("greeting");
  const [paymentCarrier, setPaymentCarrier] = useState<PaymentCarrier | null>(null);
  const [policyChecked, setPolicyChecked] = useState(() => POLICY_ITEMS.map(() => false));
  const [quoteChecked, setQuoteChecked] = useState(() => QUOTE_ITEMS.map(() => false));

  function togglePolicy(index: number) {
    setPolicyChecked((current) => current.map((value, i) => (i === index ? !value : value)));
  }

  function toggleQuote(index: number) {
    setQuoteChecked((current) => current.map((value, i) => (i === index ? !value : value)));
  }

  return (
    <aside className="bg-navy-light border-t lg:border-t-0 lg:border-l border-navy-lighter w-full lg:w-[320px] lg:fixed lg:inset-y-0 lg:right-0 flex flex-col max-h-[75vh] lg:max-h-none">
      <div className="px-4 pt-5 pb-3 shrink-0">
        <h2 className="text-lg font-semibold text-white">Call Script</h2>
        <p className="text-xs text-gray-500 mt-0.5">Read top to bottom during the call</p>
      </div>

      <div className="grid grid-cols-4 border-y border-navy-lighter shrink-0">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-1 py-2.5 text-[11px] leading-tight font-medium ${
                active
                  ? "bg-accent text-white"
                  : "bg-navy text-gray-400 hover:text-white hover:bg-navy-lighter"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {tab === "greeting" && <GreetingScript />}
        {tab === "payment" && (
          <PaymentScript carrier={paymentCarrier} onSelect={setPaymentCarrier} />
        )}
        {tab === "policy" && (
          <PolicyScript checked={policyChecked} onToggle={togglePolicy} />
        )}
        {tab === "quote" && <QuoteScript checked={quoteChecked} onToggle={toggleQuote} />}
      </div>
    </aside>
  );
}
