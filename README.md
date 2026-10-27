# FairShift

Shared worker and employer workspaces for construction, housekeeping, security, maintenance and university support teams. Real accounts and private records use Lovable Cloud; the old browser demo is no longer the active workflow.

## Run locally

Use Node.js 22.12+ or Bun. Connect this Lovable project to GitHub, then clone your actual repository URL:

```sh
git clone <your-repository-url>
cd <repository-folder>
npm install
npm run dev -- --port 8080
```

Open `http://localhost:8080`. Keep the project's generated Cloud configuration available locally. Do not commit private environment values. This app requires its connected Cloud database and migrations; it is not an offline-only demo.

```sh
npm test
npm run lint
npm run build
```

## First setup

1. Create accounts and confirm email, or use Google/Lovable sign-in.
2. A manager creates their own site. Creating a site grants authority only for that site, not any other site.
3. Workers join using that site's invitation code. Managers can appoint supervisors and other managers; workers and supervisors cannot promote themselves.
4. Set hourly rates, monthly allowances and deductions. Schedule assigned shifts with IST start/end times.
5. Generate the site's five-minute attendance QR. The worker scans it on their device or uses the code fallback.
6. Optionally enable site location verification by setting correct site coordinates and a radius. Permission is requested only at check-in/out; no continuous tracking or raw worker coordinates are stored. GPS is spoofable and can be inaccurate.

## Judges' live demonstration

Use separate worker and manager browser sessions with **test accounts and a test site**, not real employment records.

1. Ravi joins a construction site and is assigned a current shift. Display a fresh QR on the manager screen; Ravi scans it on his phone. Show validity, assignment and the new employer attendance record.
2. Show recorded hours and **Why am I getting this amount?**. The example policy is eight regular hours/day and 1.5× overtime. At ₹125/hour, a ten-hour day gives ₹1,000 regular + ₹375 overtime; add allowances and subtract deductions. For a short live session, use a transparently labelled prior test shift, not fabricated live hours.
3. Request an attendance correction, approve it with a reason, show before/after history, re-verify, then approve the month's pay. Open Ravi's approved earnings.
4. Submit damaged-equipment safety details in English or Tamil, optionally attach a photo or voice recording, and hide the worker's name if needed. Show the private reference.
5. The authorised manager assigns an investigator, records **Under Review → Action Taken → Resolved** with required action notes. Ravi reads permitted updates, without seeing other workers' reports.
6. Show **Workforce impact**: verified shifts, recorded hours, resolved hazards and resolved pay disputes. These are operational counts, not proof of improved employment outcomes.
7. Repeat with a university housekeeping or maintenance worker and a separate campus site. Show that supervisors cannot access the other site's records.
8. Optional anti-misuse check: enable the test venue's location radius, demonstrate rejection outside the radius and successful attendance inside it. Do not claim GPS prevents all cheating.

## Evaluation criteria and alignment

- **Code quality:** focused attendance, pay, safety and manager views; shared TypeScript command schemas; ESLint and Prettier. Generated integration files are excluded from lint because they are platform-owned.
- **Security:** protected screens and authenticated server functions; database-only mutations; site-scoped permissions and separate roles; private report ownership separated from manager-visible reports; append-only audit records; private media with five-minute signed reads. Text is escaped by React. Workers cannot write manager roles or other people's attendance.
- **Efficiency:** bounded dashboard reads, cached queries, 30-second refreshes, integer-paise pay maths, lazy camera scanning. Very large sites will need further pagination; the current dashboard caps shifts at 500 and reports/disputes at 200.
- **Testing:** pay, IST boundaries, QR parsing, evidence validation, role-command validation, input and route tests. Real worker/manager browser checks covered QR check-in/out, Tamil reports/photos, hidden identity, sequential resolution, pay approval, skills, location rejection and corrections.
- **Accessibility:** labelled fields, text statuses and progress, keyboard focus, skip link, main/nav landmarks, table headers and mobile overflow checks. Formal assistive-technology certification is not claimed.
- **Problem alignment:** fast accountable attendance; estimated/approved transparent earnings; particular-line disputes; confidential trackable safety concerns; required manager actions; escalation; worker-maintained skills.

## Rules, reminders and limits

- Overtime is an **assumed example policy**, not a legal determination: 1.5× after eight hours per IST calendar day. Split shifts are combined and overnight work is divided at IST midnight. Payroll uses scheduled-start IST month and current recorded terms; payment processing is not included.
- Managers can change site overtime rules; supervisors cannot. Changes clear existing approvals. No user can approve their own payroll, decide their own dispute/correction, or verify their own attendance.
- Worker Level 1 sees personal records, skills, profile and feedback. Supervisor Level 2 handles daily attendance, scheduling, safety investigations and observations without other workers' payroll/disputes. Manager Level 3 handles site access, correction decisions, payroll, rules and audit export. Current membership is one site per account, not a multi-site organisation administration system.
- New reports default to High 4h, Medium 24h, Low 72h deadlines. Managers may change future-report settings. Updates follow the four-step safety timeline.
- An hourly Cloud job escalates overdue unresolved reports to the site's authorised manager and creates in-app reminders. Maximum automatic-action delay is about one hour; scheduled callbacks may be staggered by about 30 seconds. Notifications are **in-app**, not SMS, email or guaranteed phone alerts; the schedule requires a published app. It runs 24 times/day and can add Cloud usage.
- Report language supports original Tamil/English typing and audio upload/recording. Automatic speech transcription and full-app translation are not included. Photo/voice content can reveal identity even when the name is hidden.
- Media limits: three files, 10 MB each, supported image/audio types. Malware scanning, EXIF removal and forensic device-location attestation are not included.
- Invite codes are high-entropy shared site invitations, not individual expiring invitations. Site creation is self-service; deploy organisational onboarding controls before large-scale real use.
- Publishing and a venue/device rehearsal are required before the judges' demonstration. Physical-phone camera/GPS and OAuth provider round-trips must be rehearsed on the published URL.
