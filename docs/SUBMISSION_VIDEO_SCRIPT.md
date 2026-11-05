# Three-minute submission video script

Target: **3:00 maximum**, approximately **371 spoken words**. Read naturally at about
125–130 words per minute, narrating over the screen actions. The time windows are editing
targets, not guaranteed timings; rehearse once and aim to finish the final cut by 2:55.

The opening uses Ashraf's account of volunteering during the 2024 New River Valley
flooding. It does not invent a survivor quotation, a particular family, or measured
outcomes. Technical and feature claims follow the current README and implementation.

## Narration and screen cues

### 0:00–0:30 — Your motivation

**On screen:** On camera, then transition to the homepage. Use your own NRV footage if available.

**Say:**

> Hi, I’m Ashraf, a Virginia Tech student. In 2024, I volunteered with people affected by flooding in Virginia’s New River Valley. Something stayed with me: some of the people I helped struggled to remember all the belongings they’d lost. That inspired me to build What Next, to help disaster survivors reconstruct an inventory from their photos and figure out what to do next.

### 0:30–0:45 — Brief technical overview

**On screen:** Show the homepage with a small overlay: Next.js + TypeScript → FastAPI → Muse Spark + SAM 3.1.

**Say:**

> The frontend uses Next.js, React, and TypeScript, with a Python FastAPI backend. Meta’s Muse Spark identifies belongings and powers Wren, our assistant. SAM 3.1 outlines the objects in each photo.

### 0:45–1:05 — Wren

**On screen:** Open Ask Wren. Send: “I need shelter tonight and a plan for what to do first.” Show the resulting cards, map, source links and plan.

**Say:**

> First, Wren turns a question into practical next steps. Here, I’m asking for shelter and a starting point. Wren brings together resource cards, a map, source links, and a plan for today and the week ahead. These resources follow the selected demo scenario.

### 1:05–1:20 — Aid Autopilot

**On screen:** Open Aid Autopilot. Briefly show the optional questions, then a demo program’s Help me prepare checklist.

**Say:**

> Aid Autopilot asks a few optional questions, then helps explore sample assistance programs and prepare document checklists. This prototype helps people prepare; program availability and eligibility still need checking.

### 1:20–1:35 — Toolkit and Our Story

**On screen:** Show Toolkit document checklist and insurer-call preparation. Briefly highlight the Our Story link or its text. The Story photo captions identify their researched locations separately from your NRV volunteering account.

**Say:**

> The Recovery Toolkit helps organize document replacement and prepare an insurance call. Our Story explains the personal experience behind the project. But the feature that started it all is rebuilding an inventory.

### 1:35–2:10 — One-photo demonstration

**On screen:** Open My Claim → Choose photos. Select one clear staged room photo → Scan → Review. Show object outlines, correct one detail and confirm actual belongings. Shorten a processing wait in editing if needed, and label that cut.

**Say:**

> I’m uploading an ordinary room photo—the kind someone might already have in their camera roll. Spark identifies belongings, and SAM outlines them in the image. I can review each detection, correct the details, and confirm what I actually owned. If I add more photos, the app can also help match the same item across them. The person stays in control of the inventory.

### 2:10–2:35 — Memory Web

**On screen:** Continue to Memory web. Click a confirmed item with related suggestions, then open one suggestion’s supporting-photo workflow. Use an item actually detected in your rehearsal; no fixed object names are scripted.

**Say:**

> Next is Memory Web. Clicking this confirmed item brings up related belongings I might have forgotten. It uses what’s visible as a starting point for remembering what isn’t. A suggestion needs a supporting photo and my confirmation before it becomes an inventory item. The connection helps me remember; it doesn’t establish that I owned something.

### 2:35–2:50 — Export and deletion

**On screen:** Continue to Export. Show one successfully sourced estimate, download and open the PDF, then show Finish and delete photos.

**Say:**

> Finally, I can check sourced replacement-cost estimates and download my confirmed inventory as a PDF, spreadsheet, or CSV to discuss with my insurer. When I’m finished, I can end the session and delete the photos.

### 2:50–3:00 — Closing

**On screen:** Return to your face or the What Next title card.

**Say:**

> I want What Next to make recovery a little easier: helping people remember what they lost, and find their next step.

## Recording preparation

- Choose one clear, staged room photo with several recognizable belongings. Rehearse the
  scan and choose an item that actually has related Memory Web suggestions. The script
  deliberately avoids promising a particular detection or suggestion. Keep a second
  supporting photo ready if you want to complete the suggestion workflow.
- Show the actual photo scan in live model mode. If recording in mock mode, keep its
  label visible and replace the recognition sentence with: “This is the labeled sample
  workflow. In live mode, Spark identifies belongings and SAM outlines them.”
- Prepare the Wren prompt and Aid questionnaire answers before recording. Use one
  consistent scenario. Aid's sample-program and eligibility labels should remain visible.
- Record the claim sequence together: Choose photos → Scan → Review → Memory web →
  Export. Navigating away can trigger claim-session cleanup.
- If processing, Memory Web generation or pricing takes longer than the allotted time,
  shorten the wait in editing and show “Processing wait shortened.” Rehearse a sourced
  estimate and the PDF download; if no estimate succeeds, show the confirmed inventory
  export and omit the sentence claiming a successful price lookup.
- Film the volunteering introduction on camera, or use your own verified NRV footage.
  The existing Story photographs include other locations; do not present them as footage
  of your volunteering or the NRV floods. See [image credits](IMAGE_CREDITS.md).
- Give the motivation and Memory Web the emphasis. Use a short tech-stack overlay,
  then spend the remaining screen time demonstrating the user workflow.

## If you need to cut 10–15 seconds

Remove the cross-photo matching sentence from the photo demo and the final explanatory
sentence from Memory Web. Keep the personal opening, the confirmed-photo workflow,
the assistance demo labels and the closing.
