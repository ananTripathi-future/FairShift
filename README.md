# FairShift — Decent Work Platform

**Fairer work. Transparent pay. Safer workplaces.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Open%20FairShift-2ea44f?style=for-the-badge)](https://bright-little-utility.lovable.app)
[![UN SDG 8](https://img.shields.io/badge/UN%20SDG-8%20Decent%20Work-blue?style=for-the-badge)](https://sdgs.un.org/goals/goal8)

FairShift is a worker-first platform for attendance, transparent earnings, safety reporting, and accountable workplace operations across construction, housekeeping, security, maintenance, and university support teams.

> **Demo credentials notice:** The passwords below are shared test credentials. Use them only with fictional demo data. Anyone who can access this README may be able to see them. Rotate or disable these credentials after the demonstration, and avoid publishing active passwords in a public repository.

---

## 🧭 Quick Navigation

- [Live Demo](#-1-open-the-live-demo)
- [Demo Accounts](#-2-demo-accounts)
- [Judge Walkthrough](#-3-judge-walkthrough)
- [Worker Guide](#-4-worker-guide)
- [Supervisor Guide](#-5-supervisor-guide)
- [Manager Guide](#-6-manager-guide)
- [Features](#-what-fairshift-does)
- [Run Locally](#-run-locally)
- [Security and Limitations](#-security-rules-and-limitations)

## 🚀 1. Open the Live Demo

**[Launch FairShift](https://bright-little-utility.lovable.app)**

Sign in using one of the existing demo accounts below. Do not create new accounts for the judge walkthrough. These accounts are already associated with the **FairShift Test Worksite**, so you can skip the join/create-site screens.

## 🔐 2. Demo Accounts

<details open>
<summary><strong>Click to show demo login credentials</strong></summary>

| Role | Email | Password |
|:---|:---|:---|
| **Worker** | `worker-271026@fairshift.test` | `FsTest!Work-9R43mZ` |
| **Supervisor** | `supervisor-271026@fairshift.test` | `FsTest!Sup-7K29vQ` |
| **Manager** | `manager-271026@fairshift.test` | `FsTest!Mgr-4T68xP` |

</details>

<details>
<summary><strong>Sign-in instructions and troubleshooting</strong></summary>

1. Open the [FairShift Live Demo](https://bright-little-utility.lovable.app).
2. Select **Sign in**.
3. Enter the email and password for the role you want to demonstrate.
4. To demonstrate multiple roles simultaneously, use separate browser profiles or an incognito window.
5. If sign-in fails, verify the credentials and check that the published application is reachable.

Do not use these accounts for real employment records or sensitive information.

</details>

## 🎬 3. Judge Walkthrough

Follow this sequence to demonstrate the complete FairShift workflow.

- [ ] **Attendance:** Schedule a shift for Ravi and generate a fresh site QR code.
- [ ] **Worker check-in:** Scan the QR code and check in from the worker's phone.
- [ ] **Transparent pay:** Open the payslip and select **“Why am I getting this amount?”**
- [ ] **Attendance correction:** Submit a correction request and review the manager's decision.
- [ ] **SafeVoice:** Submit a safety report in English or Tamil, optionally with a photo or audio recording.
- [ ] **Safety resolution:** Assign an investigator and move the report through its status workflow.
- [ ] **Impact dashboard:** Show verified shifts, recorded hours, resolved hazards, and resolved pay disputes.
- [ ] **Second sector:** Demonstrate a university housekeeping or maintenance scenario.

<details>
<summary><strong>Example pay calculation</strong></summary>

The example policy uses eight regular hours per day and 1.5× overtime after eight hours.

At ₹125 per hour, a ten-hour shift gives:

| Component | Calculation | Amount |
|:---|:---|---:|
| Regular pay | 8 × ₹125 | ₹1,000 |
| Overtime | 2 × ₹125 × 1.5 | ₹375 |
| **Gross before adjustments** | ₹1,000 + ₹375 | **₹1,375** |

Allowances are added and deductions subtracted to calculate net pay. This is a demonstration policy, not a legal determination.

</details>

## 👷 4. Worker Guide

<details open>
<summary><strong>Check in and check out</strong></summary>

1. Sign in using the **Worker** account on your phone.
2. Scan the current site QR using your phone camera, tap **Scan site QR** inside the app, or use the code fallback if available.
3. Tap **Check in** and allow location access if the app requests it.
4. At the end of the shift, ask the supervisor or manager to generate a fresh QR code.
5. The QR code is valid for only five minutes.
6. Review the attendance timeline: **Scheduled → Checked in → Checked out → Verified**.

</details>

<details>
<summary><strong>Request an attendance correction</strong></summary>

1. Open **Request a correction** on the worker page.
2. Enter the actual check-in/check-out times and explain the reason.
3. Submit your request.
4. The manager reviews the before/after history and approves or rejects it with a reason.

</details>

<details>
<summary><strong>Review pay and report a safety concern</strong></summary>

- Open your payslip to review regular pay, overtime, allowances, deductions, and net pay.
- Use the pay-dispute option to challenge a specific line item.
- Open **SafeVoice** to submit a safety concern in English or Tamil.
- Add a supported photo or audio recording if helpful.
- Select the severity and use the hide-name option if available.
- Keep your private reference number so you can track the report.

**Privacy reminder:** Hiding your name does not guarantee anonymity if the report details, photo, or audio recording identify you.

</details>

## 🦺 5. Supervisor Guide

<details open>
<summary><strong>Daily worksite operations</strong></summary>

1. Sign in with the **Supervisor** account.
2. Schedule a shift by selecting the worker (Ravi for the demo), date, and start/end times in IST.
3. Generate the five-minute attendance QR just before the worker scans it.
4. Review assigned workers' attendance and recorded hours.
5. Investigate assigned safety reports and record follow-up actions.
6. Direct attendance correction requests to the manager for a decision.

**Role boundaries:** Supervisors handle day-to-day operations. They cannot approve payroll, decide attendance corrections, assign roles, or change site-wide settings. Access is restricted by site permissions.

</details>

## 🧑‍💼 6. Manager Guide

<details open>
<summary><strong>Manage shifts, pay, and safety reports</strong></summary>

1. Sign in with the **Manager** account.
2. Schedule shifts and generate fresh attendance QR codes.
3. Review attendance and recorded hours.
4. Decide attendance correction requests with a reason and review the audit history.
5. Review payslips, resolve pay disputes, and approve the month's payroll.
6. Assign investigators to safety reports.
7. Update report statuses and record corrective actions.
8. Open **Workforce impact** to review verified shifts, recorded hours, resolved hazards, and resolved pay disputes.

</details>

<details>
<summary><strong>Optional: Configure location verification</strong></summary>

1. Open **Worksite location check** as the manager.
2. Enable **Require location**.
3. Enter the test site's latitude, longitude, and radius.
4. Save the settings.
5. Test attendance outside and inside the configured radius.

GPS can be inaccurate or spoofed, so location verification is not a guarantee against attendance fraud. The current design requests location at check-in/check-out rather than continuously tracking workers.

</details>

## ✨ What FairShift Does

| Feature | Purpose |
|:---|:---|
| **Smart Attendance** | QR-based check-in/check-out, shift history, and correction requests |
| **FairPay** | Transparent pay breakdowns, overtime calculations, and line-item disputes |
| **SafeVoice** | Trackable safety reports, confidential reporting options, and manager follow-up |
| **Escalation** | Escalates overdue unresolved safety reports to the authorised manager |
| **Skill History** | Worker-maintained skills and training records |
| **Workforce Impact** | Displays operational counts for verified shifts, hours, hazards, and pay disputes |
| **English and Tamil Input** | Supports reports in either language and audio upload/recording |
| **Role-Based Access** | Separates worker, supervisor, and manager permissions |

## 🛠️ Run Locally

Requirements: **Node.js 22.12+** or Bun.

```bash
git clone https://github.com/ananTripathi-future/FairShift.git
cd FairShift
npm install
npm run dev -- --port 8080
```

Open https://bright-little-utility.lovable.app

> The application requires its connected Lovable Cloud configuration, database, and migrations. It is not an offline-only demo. Keep private environment values out of GitHub.

<details>
<summary><strong>Run tests and build checks</strong></summary>

```bash
npm test
npm run lint
npm run build
```

</details>

## 🔒 Security, Rules, and Limitations

<details>
<summary><strong>Roles and permissions</strong></summary>

- **Worker:** Views personal records, skills, profile, and feedback. Cannot edit another worker's attendance or approve their own payroll.
- **Supervisor:** Handles daily attendance, scheduling, safety investigations, and observations. Cannot approve payroll or decide correction requests.
- **Manager:** Handles site access, correction decisions, payroll, rules, and audit exports.
- Users must not approve their own payroll, decide their own disputes/corrections, or verify their own attendance.
- Access is site-scoped; users should not be able to access another site's records.

</details>

<details>
<summary><strong>Implementation notes and limitations</strong></summary>

- Overtime is an assumed example policy: 1.5× after eight hours per IST calendar day. It is not a legal determination.
- Split shifts are combined and overnight work is divided at IST midnight.
- Payroll uses the scheduled-start IST month and current recorded terms; payment processing is not included.
- Default safety-report deadlines are High: 4 hours, Medium: 24 hours, and Low: 72 hours. Managers may change settings for future reports.
- Overdue reports are escalated by an hourly Cloud job and create in-app reminders. SMS/email alerts are not included, and the published app is required for scheduled jobs.
- Tamil/English typing and audio upload/recording are supported. Automatic speech transcription and full-app translation are not included.
- Photo/audio content may reveal identity even when a name is hidden.
- Media limits are three files, up to 10 MB each, for supported image/audio types. Malware scanning, EXIF removal, and forensic device-location attestation are not included.
- Invite codes are shared site invitations, not individual expiring invitations.
- Workforce impact metrics are operational counts, not proof of improved employment outcomes.
- Large sites may require further pagination; current dashboard limits are 500 shifts and 200 reports/disputes.
- Test physical-phone camera/GPS and sign-in flows on the published URL before the judges' demonstration.

</details>

## 🌍 Problem Alignment

FairShift supports **UN Sustainable Development Goal 8: Decent Work and Economic Growth** by making attendance and pay records easier to understand, creating a trackable path for safety concerns, and improving accountability between workers and workplace managers.

---

<div align="center">

**FairShift**  
*Built for safer, fairer, and more transparent workplaces.*

[Launch Demo](https://bright-little-utility.lovable.app) · [GitHub Repository](https://github.com/ananTripathi-future/FairShift)

</div>
