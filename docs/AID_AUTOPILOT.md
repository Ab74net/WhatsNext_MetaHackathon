# Aid Autopilot

Route: `/aid`. The primary reference is `scripts/mockupsfornehomepage/aidautopilot.png`.

The page retains the app shell, tokens, light/dark toggle, emergency link and mobile navigation. Its editorial heading, desktop rail, monochrome local photo with flat shapes, situation summary, and compact category cards follow the supplied reference. The photograph is an existing optimized homepage asset; no image service or new dependency was added.

## Flow

1. Open Aid Autopilot from the main navigation or homepage.
2. Select **Find my resources**. All five questions are optional; Back and Skip work. Confirm the summary before discovery.
3. Explore financial assistance, temporary housing and essential needs. Filter by category, saved links or text.
4. Expand a resource to inspect its limitations, optional document-preparation prompts, provider link and source-review date.
5. Select **Help me prepare**. Mark documents, add notes, save the provider link and track your own application status. Completing documents never changes status automatically.
6. Download JSON or print the selected preparation. **Submitted** is explicitly self-reported; no application is sent or verified by the app.
7. **Ask the assistant** opens an editable request with the program and confirmed situation. It excludes preparation notes and evidence. Review it before Send.

## What is demo functionality

`apps/web/public/aid-programs.json` contains five illustrative records with actual provider guidance links. Every record is labeled **Demo record** and **Eligibility needs checking**. No record is an approval, a confirmed local opening, a financial award, or an announced application window.

The adapter in `src/lib/aidAutopilot.ts` loads that catalog without sending the questionnaire answers. Filtering uses disaster type and selected needs; location and housing are context, not verified eligibility inputs. A real implementation can replace `AidDiscoveryAdapter.discover` while retaining validation and the UI. A catalog error produces a retry state; an empty response or filters without matches produce an empty state.

Source pages reviewed November 2, 2026:

- [USAGov: disaster assistance](https://www.usa.gov/disaster-assistance)
- [American Red Cross: shelter directory](https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html)
- [USAGov: disaster food relief](https://www.usa.gov/disaster-food-help)
- [United Way 211: disaster recovery](https://211.org/get-help/disaster-recovery)
- [National Flood Insurance Program: start a claim](https://www.floodsmart.gov/recover/start-a-claim)

The dates indicate review of general guidance, not verification of availability for a particular disaster or applicant. The checklists are preparation prompts; providers determine their own required documents.

## State and privacy

`components/aid/AidProvider.tsx` holds situation, preparation and assistant-draft state in the root shell. It uses React memory only, with no localStorage, sessionStorage, database, analytics, photo access or location lookup for new aid information. Navigation within the app retains it; a reload clears it. Downloading and printing intentionally include the user's notes. Saved links are retained only in that in-memory session unless included in a download.

When a previous assistant conversation exists, its demo disaster and place can be offered as a proposal. The user must review and confirm them. Canceling the questionnaire does not adopt that proposal. Claim photos are not inspected or inferred from.

The assistant still supports its existing demo map regions. Its handoff banner explains that the aid location is unverified and the map is a separate demo scenario. The prepared request asks for general requirements and prohibits treating the demo region as the applicant's location. Choosing Send then uses the existing assistant API and tab-scoped conversation storage; preparation notes remain excluded. There is no new model tool or application-submission API.

## Files

- `app/aid/page.tsx`: route and metadata.
- `components/aid/`: feature page, optional questionnaire, expandable resource card, preparation view and memory provider.
- `lib/aidAutopilot.ts`: types, source validation, demo adapter, filtering, assistant draft and JSON summary.
- `public/aid-programs.json`: source-linked demo records.
- `components/AppShell.tsx`, `app/page.tsx`: navigation and homepage entry point.
- `app/agent/page.tsx`, `lib/useAgent.ts`: reviewed handoff and optional previous-demo context.
- `app/globals.css`: responsive feature styles and isolated light printing.

## Local checks

Run `npm run dev`, then open `http://localhost:3000/aid`. The catalog and preparation work even when the backend is unavailable. Prior-case lookup and the assistant itself use the existing backend.

Try **Flood → Tampa, Florida → I rent → Temporary housing + Furniture & belongings → Skip → Find resources**. Open FEMA's sample card, inspect the limitations, prepare a checklist, add notes, save its link, and download JSON or print. Switch themes, return through the assistant, then reload to confirm aid details clear. To test a load error, block `aid-programs.json` in browser developer tools, start discovery, then unblock it and select Try again. Search for an unmatched term or select Saved links before saving anything to test empty states.

Automated unit coverage runs with `npm run test:web`: optional inputs, need/disaster filtering, unsafe links and malformed catalog entries, honest summary status, and constrained assistant drafts. The production build includes TypeScript validation. Browser checks use synthetic answers and intercept assistant API calls, so they do not evaluate live eligibility, live disaster data or model quality.

Verified: production build; all 20 frontend tests (7 new); desktop and phone layouts in both themes; extra 320px, 768px and 1024px width checks; questionnaire Back/Skip/confirmation; filters and saved-link empty states; checklist status and notes; downloaded JSON contents; light printing without the side rail; a reviewed assistant draft with no automatic request or preparation notes; navigation retention and reload clearing; canceled/confirmed prior-demo proposals; and catalog loading, error, retry and empty responses. Local screenshots are ignored artifacts in `scripts/out/redesign/`, prefixed with `aid` or the theme and `aid`.
