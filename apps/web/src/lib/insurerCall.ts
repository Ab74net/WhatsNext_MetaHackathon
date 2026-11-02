// Insurer-call prep: the shapes of the user's notes and the follow-up email, built entirely
// on the device. No import aliases here, so `node --test` can load it (see insurerCall.test.ts).

export interface PrepDetails {
  myName: string;
  myPhone: string;
  policyNumber: string;
  claimNumber: string;
  dateOfLoss: string; // yyyy-mm-dd
  damagedAddress: string;
  tempAddress: string;
}

export interface NextStep {
  id: string;
  text: string;
  due: string; // yyyy-mm-dd or ""
}

export interface CallNotes {
  callAt: string; // yyyy-mm-ddThh:mm (datetime-local) or ""
  repName: string;
  reference: string;
  promised: string;
  log: string; // free notes, with "Stamp the time" entries
  steps: NextStep[];
}

export const EMPTY_PREP: PrepDetails = {
  myName: "", myPhone: "", policyNumber: "", claimNumber: "", dateOfLoss: "", damagedAddress: "", tempAddress: "",
};
export const EMPTY_NOTES: CallNotes = { callAt: "", repName: "", reference: "", promised: "", log: "", steps: [] };

/** Placeholders only. Real values are substituted on the device by fillTemplate. */
export const EMAIL_SUBJECT = "Summary of my call on {{call_date}} (claim {{reference_number}})";
export const EMAIL_TEMPLATE = `Hello {{rep_name}},

Thank you for speaking with me on {{call_date}}. I am writing to confirm what we discussed, so we both have a written record.

Policy number: {{policy_number}}
Claim or reference number: {{reference_number}}
Date of loss: {{date_of_loss}}
Property address: {{damaged_address}}
Where I am staying now: {{temp_address}}

What you told me:
{{promised}}

Next steps:
{{next_steps}}

If I have misunderstood anything, please reply to correct it in writing.

Thank you,
{{my_name}}
{{my_phone}}`;

const humanize = (key: string) => key.replace(/_/g, " ");

/**
 * Replace {{key}} placeholders with values. A "Label: {{key}}" line whose value is empty is
 * dropped; any other empty or unknown placeholder becomes "[key words]" for the user to fill in.
 */
export function fillTemplate(template: string, values: Record<string, string>): string {
  const lines: string[] = [];
  for (const line of template.split("\n")) {
    const labelled = /^[^{}]+:\s*\{\{(\w+)\}\}\s*$/.exec(line);
    if (labelled && !values[labelled[1]]?.trim()) continue;
    lines.push(line.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key]?.trim() || `[${humanize(key)}]`));
  }
  return lines.join("\n");
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return iso.length > 10 ? `${date} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : date;
}

export function emailValues(prep: PrepDetails, notes: CallNotes): Record<string, string> {
  const steps = notes.steps.filter((s) => s.text.trim())
    .map((s) => `- ${s.text.trim()}${s.due ? ` (by ${formatDate(s.due)})` : ""}`).join("\n");
  return {
    rep_name: notes.repName,
    call_date: formatDate(notes.callAt),
    policy_number: prep.policyNumber,
    reference_number: notes.reference || prep.claimNumber,
    date_of_loss: formatDate(prep.dateOfLoss),
    damaged_address: prep.damagedAddress,
    temp_address: prep.tempAddress,
    promised: notes.promised,
    next_steps: steps,
    my_name: prep.myName,
    my_phone: prep.myPhone,
  };
}

export function buildFollowUpEmail(prep: PrepDetails, notes: CallNotes) {
  const values = emailValues(prep, notes);
  return {
    subject: fillTemplate(EMAIL_SUBJECT, values).replace(/ \(claim \[reference number\]\)$/, ""),
    body: fillTemplate(EMAIL_TEMPLATE, values),
  };
}

/** "[3:42 PM] " for the Stamp the time button. */
export function timeStamp(now = new Date()): string {
  return `[${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}] `;
}
