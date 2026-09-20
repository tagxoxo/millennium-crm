"use client";

import type { ReactNode } from "react";
import { VA_CARRIER_LABELS, VA_CARRIERS, type VaCarrier } from "@/lib/va";
import {
  digitsOnly,
  formatCardNumberInput,
  formatExpInput,
  type PaymentCardInput,
} from "@/lib/vaPayment";
import {
  VA_POLICY_SCRIPT_ITEMS,
  VA_QUOTE_SCRIPT_ITEMS,
  type VaScriptItem,
  type VaScriptTab,
} from "@/lib/vaScript";

const TABS: { id: VaScriptTab; label: string }[] = [
  { id: "greeting", label: "Greeting" },
  { id: "payment", label: "Payment" },
  { id: "policy", label: "Policy Change" },
  { id: "quote", label: "New Quote" },
];

const scriptInputClass =
  "w-full mt-1.5 px-2.5 py-1.5 bg-navy border border-navy-lighter rounded-md text-white text-xs placeholder-gray-500 focus:outline-none focus:border-accent";

function Line({ children }: { children: ReactNode }) {
  return <p className="text-white font-semibold leading-relaxed text-sm">{children}</p>;
}

function Cue({ children }: { children: ReactNode }) {
  return <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{children}</p>;
}

function PaymentScript({
  carrier,
  notes,
  card,
  onSelect,
  onNotes,
  onCard,
}: {
  carrier: VaCarrier | null;
  notes: string;
  card: PaymentCardInput;
  onSelect: (value: VaCarrier) => void;
  onNotes: (value: string) => void;
  onCard: (field: keyof PaymentCardInput, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Cue>Ask:</Cue>
      <Line>&ldquo;Of course! Who is your insurance carrier?&rdquo;</Line>

      <div className="grid grid-cols-3 gap-2">
        {VA_CARRIERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`py-3 rounded-lg text-xs font-semibold border transition-colors ${
              carrier === value
                ? "bg-accent text-white border-accent"
                : "bg-navy text-gray-200 border-navy-lighter hover:border-accent hover:text-white"
            }`}
          >
            {VA_CARRIER_LABELS[value]}
          </button>
        ))}
      </div>

      {carrier && (
        <div className="space-y-3 pt-1">
          <Line>
            &ldquo;I can take your card information and submit the payment for the agent to process.&rdquo;
          </Line>

          <div>
            <p className="text-white text-sm font-semibold">
              &ldquo;What&apos;s the card number?&rdquo;
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={card.number}
              onChange={(e) => onCard("number", formatCardNumberInput(e.target.value))}
              placeholder="•••• •••• •••• ••••"
              className={scriptInputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-white text-sm font-semibold">&ldquo;Expiration — month and year?&rdquo;</p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={card.exp}
                onChange={(e) => onCard("exp", formatExpInput(e.target.value))}
                placeholder="MM/YY"
                className={scriptInputClass}
              />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">&ldquo;And the CVC?&rdquo;</p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={card.cvc}
                onChange={(e) => onCard("cvc", digitsOnly(e.target.value).slice(0, 4))}
                placeholder="123"
                className={scriptInputClass}
              />
            </div>
          </div>

          <div>
            <p className="text-white text-sm font-semibold">
              &ldquo;Name as it appears on the card?&rdquo;
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                autoComplete="off"
                value={card.first_name}
                onChange={(e) => onCard("first_name", e.target.value)}
                placeholder="First name"
                className={scriptInputClass}
              />
              <input
                type="text"
                autoComplete="off"
                value={card.last_name}
                onChange={(e) => onCard("last_name", e.target.value)}
                placeholder="Last name"
                className={scriptInputClass}
              />
            </div>
          </div>

          <div>
            <p className="text-white text-sm font-semibold">&ldquo;Billing zip code?&rdquo;</p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={card.zip}
              onChange={(e) => onCard("zip", digitsOnly(e.target.value).slice(0, 10))}
              placeholder="37040"
              className={scriptInputClass}
            />
          </div>

          <Line>&ldquo;Submitting this now....one moment please&rdquo;</Line>
        </div>
      )}

      <div>
        <Cue>Write down anything else they said</Cue>
        <textarea
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          rows={3}
          placeholder="Payment notes for this ticket"
          className={`${scriptInputClass} resize-y min-h-[72px]`}
        />
      </div>
    </div>
  );
}

function AnswerList({
  items,
  answers,
  onAnswer,
}: {
  items: VaScriptItem[];
  answers: Record<string, string>;
  onAnswer: (key: string, value: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const value = answers[item.key] ?? "";
        const on = value.trim().length > 0;
        return (
          <li
            key={item.key}
            className={`rounded-lg border px-3 py-2.5 ${
              on ? "border-green-500/40 bg-green-500/10" : "border-navy-lighter bg-navy"
            }`}
          >
            <p className={`text-sm font-semibold ${on ? "text-green-300" : "text-white"}`}>
              {item.label}
            </p>
            <p className={`text-xs mt-0.5 leading-relaxed font-semibold ${on ? "text-green-200/90" : "text-white"}`}>
              &ldquo;{item.say}&rdquo;
            </p>
            <textarea
              value={value}
              onChange={(e) => onAnswer(item.key, e.target.value)}
              rows={2}
              placeholder="Write their answer"
              className={`${scriptInputClass} resize-y min-h-[52px]`}
            />
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

function PolicyScript({
  answers,
  onAnswer,
  emailedOnCall,
  onEmailedOnCall,
}: {
  answers: Record<string, string>;
  onAnswer: (key: string, value: string) => void;
  emailedOnCall: boolean;
  onEmailedOnCall: (value: boolean) => void;
}) {
  const detailsReady = VA_POLICY_SCRIPT_ITEMS.every((item) => (answers[item.key] ?? "").trim());

  return (
    <div className="space-y-4">
      <Cue>Say:</Cue>
      <Line>
        &ldquo;Absolutely, I can submit that change request for you. Let me grab a few details.&rdquo;
      </Line>

      <Cue>Ask and write down each answer:</Cue>
      <AnswerList items={VA_POLICY_SCRIPT_ITEMS} answers={answers} onAnswer={onAnswer} />

      <div className="rounded-lg border border-red-500/70 bg-red-500/15 px-3 py-3 space-y-2.5">
        <p className="text-red-400 text-xs font-bold uppercase tracking-wide">
          On this call — before you submit
        </p>
        <ol className="space-y-2 text-sm text-red-300 list-decimal pl-4 font-medium">
          <li>
            Email them a summary of this change <span className="font-bold text-red-200">now, while they are still on the phone</span>.
          </li>
          <li>
            Tell them:{" "}
            <span className="font-bold text-red-200">
              &ldquo;You&apos;ll receive an email summarizing your request. Please reply back with
              &apos;I confirm this endorsement&apos; so we can process it.&rdquo;
            </span>
          </li>
          <li>
            Then press <span className="font-bold text-red-200">Submit ticket</span> on the left.
            Do not process the endorsement yourself — the agent will do it after they reply in writing.
          </li>
        </ol>
        <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={emailedOnCall}
            onChange={(e) => onEmailedOnCall(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-red-500"
          />
          <span className="text-sm font-bold text-red-200 leading-snug">
            I emailed the insured a summary on this call
          </span>
        </label>
      </div>

      {detailsReady && emailedOnCall && (
        <div className="bg-green-500/10 border border-green-500/40 rounded-lg px-3 py-2.5">
          <p className="text-green-300 text-sm font-medium leading-relaxed">
            Now press Submit ticket. The agent will process the endorsement after written confirmation.
          </p>
        </div>
      )}
    </div>
  );
}

function QuoteScript({
  answers,
  onAnswer,
}: {
  answers: Record<string, string>;
  onAnswer: (key: string, value: string) => void;
}) {
  const ready = VA_QUOTE_SCRIPT_ITEMS.every((item) => (answers[item.key] ?? "").trim());

  return (
    <div className="space-y-4">
      <Cue>Say:</Cue>
      <Line>
        &ldquo;I&apos;d love to help you get a quote! Let me pull up some information — this will just
        take a couple minutes.&rdquo;
      </Line>

      <Cue>Ask and write down each answer in order:</Cue>
      <AnswerList items={VA_QUOTE_SCRIPT_ITEMS} answers={answers} onAnswer={onAnswer} />

      {ready && (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/40 rounded-lg px-3 py-2.5">
            <p className="text-green-300 text-sm font-medium leading-relaxed">
              Ready to submit — fill in the New Request form and select New Quote. These answers go
              with the ticket.
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

export default function VaCallScript({
  tab,
  onTabChange,
  paymentCarrier,
  onPaymentCarrier,
  paymentNotes,
  onPaymentNotes,
  paymentCard,
  onPaymentCard,
  policyAnswers,
  onPolicyAnswer,
  policyEmailedOnCall,
  onPolicyEmailedOnCall,
  quoteAnswers,
  onQuoteAnswer,
}: {
  tab: VaScriptTab;
  onTabChange: (tab: VaScriptTab) => void;
  paymentCarrier: VaCarrier | null;
  onPaymentCarrier: (value: VaCarrier) => void;
  paymentNotes: string;
  onPaymentNotes: (value: string) => void;
  paymentCard: PaymentCardInput;
  onPaymentCard: (field: keyof PaymentCardInput, value: string) => void;
  policyAnswers: Record<string, string>;
  onPolicyAnswer: (key: string, value: string) => void;
  policyEmailedOnCall: boolean;
  onPolicyEmailedOnCall: (value: boolean) => void;
  quoteAnswers: Record<string, string>;
  onQuoteAnswer: (key: string, value: string) => void;
}) {
  return (
    <aside className="bg-navy-light border-t lg:border-t-0 lg:border-l border-navy-lighter w-full lg:w-[320px] lg:fixed lg:inset-y-0 lg:right-0 flex flex-col max-h-[75vh] lg:max-h-none">
      <div className="px-4 pt-5 pb-3 shrink-0">
        <h2 className="text-lg font-semibold text-white">Call Script</h2>
        <p className="text-xs text-gray-500 mt-0.5">Ask, write the answer, then submit the ticket</p>
      </div>

      <div className="grid grid-cols-4 border-y border-navy-lighter shrink-0">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
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
          <PaymentScript
            carrier={paymentCarrier}
            notes={paymentNotes}
            card={paymentCard}
            onSelect={onPaymentCarrier}
            onNotes={onPaymentNotes}
            onCard={onPaymentCard}
          />
        )}
        {tab === "policy" && (
          <PolicyScript
            answers={policyAnswers}
            onAnswer={onPolicyAnswer}
            emailedOnCall={policyEmailedOnCall}
            onEmailedOnCall={onPolicyEmailedOnCall}
          />
        )}
        {tab === "quote" && (
          <QuoteScript answers={quoteAnswers} onAnswer={onQuoteAnswer} />
        )}
      </div>
    </aside>
  );
}