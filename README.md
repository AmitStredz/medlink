<div align="center">

# MedLink

**Patient-controlled medical records on IPFS, with consent enforced by a smart contract.**

*Secure Digital Health Records Management System*

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=black)](https://tailwindcss.com)
[![Django](https://img.shields.io/badge/Django-REST-092E20?style=flat-square&logo=django&logoColor=white)](https://www.djangoproject.com)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.17-363636?style=flat-square&logo=solidity&logoColor=white)](https://soliditylang.org)
[![IPFS](https://img.shields.io/badge/IPFS-Content%20Addressed-65C2C7?style=flat-square&logo=ipfs&logoColor=white)](https://ipfs.tech)

</div>

> **Live demo:** [medlink-tool.vercel.app](https://medlink-tool.vercel.app/) · **Demo video:** [watch the walkthrough on Google Drive](https://drive.google.com/file/d/1o6Nij3_pYSiVWaZHXXpqtsAq2LNz-s8K/view)

---

## Table of Contents

- [What is MedLink?](#what-is-medlink)
- [The Problem](#the-problem)
- [Use Cases](#use-cases)
- [How It Works](#how-it-works)
  - [Architecture](#architecture)
  - [Off-chain / On-chain split](#off-chain--on-chain-split)
  - [The consent workflow](#the-consent-workflow)
  - [Access control contract](#access-control-contract)
- [Feature Tour](#feature-tour)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Project Status](#project-status)
- [Security Notes & Known Limitations](#security-notes--known-limitations)
- [Roadmap](#roadmap)
- [Acknowledgements](#acknowledgements)
- [License](#license)

---

## What is MedLink?

MedLink is a **doctor-side workspace for managing patient records where the patient holds the keys**.

Every patient's medical data lives in **IPFS** (content-addressed, off-chain storage). What goes on-chain is *not* the data — it is the **consent map**: who is allowed to read which patient's records. A doctor's access is never implicit; the patient explicitly grants it, and can revoke it at any time.

Three consequences fall out of that one decision:

1. **The patient controls access.** A doctor requests access from the patient's profile; the patient approves or denies. No approval, no records — enforced by a `require` in the smart contract, not by a UI checkbox.
2. **Medical history follows the patient, not the doctor.** Because the record set is owned by the *patient's* identity and permissioned by the patient, a patient who changes doctors doesn't lose their history. The new doctor sees the full longitudinal record — with consent — instead of starting from a blank file.
3. **Sensitive data stays off-chain.** The chain stores CIDs and permissions. The documents themselves live in IPFS, and are only ever served to an address the contract has cleared.

On top of the record system, MedLink ships a **clinical community channel** where doctors post diagnostic doubts and peers respond — giving junior physicians exposure to real diagnostic reasoning, not textbook abstractions.

---

## The Problem

| Problem today | Why it hurts |
|---|---|
| **Records live in hospital silos.** | A patient moves clinics and the history goes with them — or gets lost. |
| **Paper and portal-based sharing.** | Slow, insecure, and patients have no visibility or control over who read their chart. |
| **No continuity across doctors.** | Every new doctor re-asks history the patient has already given ten times. |
| **New physicians lack real case exposure.** | Textbooks describe typical presentations; real cases are messy, atypical, and decision-shaped. |
| **Consent is a checkbox, not an enforced rule.** | "I consent to share" is unenforceable once the data is copied around. |

MedLink attacks the first four with a patient-owned record and a permissioned access layer, and the fifth by moving consent *into* the contract.

---

## Use Cases

### 1. Patient-controlled access to records
A doctor opens a patient's profile and sends an access request. The patient receives it and decides — approve or deny. On approval, the doctor's wallet address is written into the patient's access list on-chain, and only then can the doctor read the patient's record CIDs and fetch the documents from IPFS. The doctor cannot bypass this: the contract rejects reads from unapproved addresses.

### 2. Continuity of care across different doctors
A patient sees Dr. A this month and Dr. B next month. Because the record set belongs to the patient, Dr. B — once approved by the patient — sees the *same* longitudinal history: past diagnoses, medications, lab results, and the AI-generated summary. Diagnosis stops restarting at every consultation, and the patient stops repeating themselves.

### 3. A community channel for clinical doubt
Any doctor can post a diagnostic question ("Second-opinion needed on an atypical presentation…"). Peers respond in comments with their reasoning and experience. Junior doctors get to see how experienced clinicians actually think through a case — an exposure that no textbook provides.

---

## How It Works

### Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      MEDLINK CLIENT  (React 19 SPA)                 │
│   Dashboard · Patients · Records · AI Assistant · Community          │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │  HTTPS  ·  Authorization: Token <key>
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  API LAYER  —  Django REST Framework                  │
│   /api/auth/login   /api/patients   /api/records   /api/posts       │
│   /api/comment      /api/chat       /api/userProfile                 │
└───────────┬───────────────────────────────────┬──────────────────────┘
            │ record metadata, CIDs              │ consent decisions,
            │ patient + doctor profiles          │ access list, revocations
            ▼                                   ▼
   ┌──────────────────────┐          ┌──────────────────────────────┐
   │   IPFS  (off-chain)  │◄── CID ──│   SMART CONTRACT (on-chain)  │
   │   · reports / PDFs   │          │   · ownership[patient][doc]   │
   │   · lab results      │          │   · accessList[patient]       │
   │   · images           │          │   · ownership → read gating   │
   └──────────────────────┘          └──────────────┬───────────────┘
                                                       │
                                            ┌──────────▼───────────┐
                                            │  Patient's Wallet   │
                                            │  approve / revoke   │
                                            └──────────────────────┘
```

### Off-chain / On-chain split

| Data | Stored | Why |
|---|---|---|
| Report PDFs, lab result images, scans | **IPFS** (off-chain) | Large, binary, and must not be replicated to every ledger node. Content-addressed, so the CID is a tamper-evident fingerprint. |
| Record metadata (name, date, type, summary, tags) | **API / database** | Queryable, relational, needs filtering and search. |
| `CIDs` of a patient's documents | **On-chain** | The pointer that lets the contract gate access to real content. |
| `ownership[patient][doctor]` | **On-chain** | The consent fact. Readable by any node, enforceable by the contract. |
| `accessList[patient]` | **On-chain** | Who currently has access — the patient's own revocation dashboard. |

The rule: **bulk data off-chain, permissions on-chain.**

### The consent workflow

```
 Patient                Doctor                Contract              IPFS
   │                      │                      │                    │
   │  record uploaded    │                      │                    │
   │───────────────────────────────────────────► │  add(user, cid)    │
   │                      │                      │  value[user] += cid│
   │                      │                      │                    │
   │                      │  request access      │                    │
   │                      │─────────────────────►│                    │
   │  approve / deny      │                      │                    │
   │───────────────────────────────────────────► │  allow(doctor)     │
   │                      │                      │  ownership[pat][dr]│
   │                      │                      │  = true            │
   │                      │  read records        │                    │
   │                      │─────────────────────►│  display(patient)  │
   │                      │                      │  require(owner ||  │
   │                      │                      │   ownership)       │
   │                      │  ◄── CIDs ───────────│                    │
   │                      │                      │                    │
   │                      │  fetch documents     │                    │
   │                      │─────────────────────────────────────────► │
   │                      │  ◄── content ─────────────────────────────────
```

The critical line is inside `display()`:

```solidity
require(_user == msg.sender || ownership[_user][msg.sender], "You do not have access");
```

A doctor who has not been approved **cannot** read the record list, no matter what the frontend sends.

### Access control contract

The prototype contract (`contracts/smart_contract.sol`, deployed via Hardhat) keeps everything keyed by the **patient's wallet address**:

```solidity
contract Upload {
    struct Access { address user; bool access; }

    mapping(address => string[])                value;        // patient => record CIDs
    mapping(address => mapping(address => bool)) ownership;    // patient => doctor => granted
    mapping(address => Access[])                accessList;   // patient => doctors w/ access
    mapping(address => mapping(address => bool)) previousData; // dedupe guard

    function add(address _user, string memory url) external;   // publish a record CID
    function allow(address user) external;                       // patient grants consent
    function disallow(address user) public;                      // patient revokes consent
    function display(address _user) external view returns (string[] memory); // gated read
    function shareAccess() view public returns (Access[] memory);            // patient's access list
}
```

| Function | Caller | Effect |
|---|---|---|
| `add(user, url)` | Anyone (prototype) | Appends a record CID to `value[user]`. |
| `allow(doctor)` | Patient (`msg.sender`) | Sets `ownership[patient][doctor] = true` and adds/updates the entry in `accessList[patient]`. |
| `disallow(doctor)` | Patient (`msg.sender`) | Flips the permission off and marks the access-list entry revoked. |
| `display(patient)` | Patient **or** approved doctor | Returns the record CIDs; reverts otherwise. |
| `shareAccess()` | Patient | Returns the list of doctors holding access — the revocation view. |

`previousData` prevents duplicate entries in `accessList` when a doctor is re-approved after a revoke.

> The contract work lives in the repository history (`git show 11d7362:contracts/smart_contract.sol`) and was reverted from `master` during deployment hardening of the web app. See [Project Status](#project-status).

---

## Feature Tour

### 🔐 Authentication
Token-based login against the REST API, with a protected-route wrapper for every app route. Session state lives in React context and is persisted to `localStorage`. A built-in **demo account** (`demouser` / `demo123`) signs you straight into the app without hitting the network — useful for a quick look.

### 📊 Dashboard
Doctor profile and practice overview — visit-activity chart, condition distribution doughnut, severity-filtered clinical alerts, upcoming appointments, and task tracking. Charts are rendered with **Chart.js** via `react-chartjs-2`.

### 👥 Patients
- Debounced, server-side patient search (500 ms debounce via `lodash.debounce`)
- Patient cards with age, gender, and verification state
- Full record timeline per patient: diagnosis reports, medication records, and lab results — each with date, AI summary, and tags
- "Add Patient" and "Add Report" flows with loading and success states

### 🧠 AI Assistant
A context-aware clinical assistant bound to a selected patient. The selected patient's records are fetched and passed as context, so the assistant reasons about *that* patient's history rather than answering generically. Conversation history persists per patient in `localStorage`. Responses are rendered with lightweight markdown (`**bold**` → `<strong>`).

### 💬 Community
- Post a diagnostic doubt with title, description, and tags
- Comment threads on posts
- Upvote / downvote and filter by category
- Relative timestamps ("3 hours ago")

### 📱 Responsive by default
Collapsible, animated sidebar with a mobile hamburger + overlay; layouts reflow from single-column mobile to split-panel desktop.

---

## Tech Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| **React** | 19 | UI framework, function components + hooks |
| **react-router-dom** | 7.2 | Client-side routing (`/dashboard`, `/patients`, `/community`, `/ai`) |
| **Tailwind CSS** | 3.4 | Utility-first styling; custom breakpoints in `tailwind.config.js` |
| **Axios** | 1.8 | HTTP client; attaches `Authorization: Token <key>` |
| **Chart.js** + `react-chartjs-2` | 4.4 / 5.3 | Dashboard analytics charts |
| **react-icons** | 5.5 | Iconography (Font Awesome, Material, Remix, Bootstrap Icons) |
| **lodash.debounce** | 4.0 | Debounced search inputs |
| **Create React App** (`react-scripts`) | 5.0.1 | Build tooling, dev server, Jest |

### Backend & Data Layer
| Technology | Role |
|---|---|
| **Django REST Framework** | REST API, token authentication, ORM-backed models |
| **Solidity / Hardhat** | On-chain consent & access control (prototype contract) |
| **IPFS** | Off-chain, content-addressed storage for medical documents |

---

## Project Structure

```
medlink/
├── public/                        # Static assets, manifest, PWA metadata
└── src/
    ├── components/
    │   ├── ProtectedRoute.js      # Auth-gated route wrapper
    │   ├── SidebarOption.js       # Sidebar nav item
    │   ├── sidebar.js             # Responsive app shell + nav
    │   ├── login.js               # Login form, token handling, error states
    │   ├── addPatientModal.js     # Create patient
    │   ├── addReportModal.js      # Attach a record (name + CID/URL + type)
    │   ├── createPostModal.js     # New community post
    │   ├── commentModal.js        # Comment on a post
    │   ├── chatBot.js             # AI assistant chat panel
    │   └── successModal.js        # Success confirmation
    ├── context/
    │   └── AuthContext.js         # Auth state, token persistence, user type
    ├── pages/
    │   ├── dashboardContent.js    # Dashboard + charts + alerts
    │   ├── patient.js             # Patient list, search, record timeline
    │   ├── community.js           # Community feed
    │   └── aiAssistant.js         # Patient-scoped AI assistant
    ├── App.js                     # Routes + providers
    ├── main.js                    # Authenticated app shell + nested routes
    └── index.js                   # Entry point
```

### Smart contract (in git history)

The blockchain layer was developed in a dedicated commit and is preserved there rather than on `master`:

```bash
# Inspect the contract, Hardhat config, deployment script and tests
git show 11d7362:contracts/smart_contract.sol
git show 11d7362:hardhat.config.js
git show 11d7362:scripts/deploy.js
git show 11d7362:test/Lock.js
```

| Path (at commit `11d7362`) | Purpose |
|---|---|
| `contracts/smart_contract.sol` | `Upload` — on-chain access control |
| `hardhat.config.js` | Solidity 0.8.17 toolchain |
| `scripts/deploy.js` | Deployment script |
| `test/Lock.js` | Contract test suite (Hardhat boilerplate) |

---

## API Reference

Base URL: `https://medlink-zavgk.ondigitalocean.app/api`

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `POST` | `/auth/login/` | Authenticate; returns `{ key }` token | No |
| `GET` | `/userProfile/` | Current doctor's profile + user type | Yes |
| `GET` | `/patients/?search=` | List / search patients | Yes |
| `POST` | `/patients/` | Create a patient record | Yes |
| `GET` | `/records/{patient_id}` | Patient's record timeline (name, date, url, summary, tags) | Yes |
| `POST` | `/records/` | Attach a record — `{ id, name, url, record_type }` | Yes |
| `GET` | `/posts/` | Community feed | Yes |
| `POST` | `/posts/` | Create a post — `{ title, desc }` | Yes |
| `POST` | `/comment/` | Comment — `{ id, comment }` | Yes |
| `POST` | `/chat/` | AI assistant — `{ patient_id, prompt }` | Yes |

**Record types:** `diagnoses` · `medications` · `labresult`

**Authentication:** all protected calls send `Authorization: Token <key>`, where `key` is the token issued at login and persisted client-side.

---

## Getting Started

### Prerequisites

- Node.js 16+
- npm 8+
- A running instance of the REST API (see [Deployment](#deployment))

### Install & Run

```bash
git clone https://github.com/AmitStredz/medlink.git
cd medlink
npm install
npm start
```

Open **http://localhost:3000**.

### Demo credentials

| Username | Password |
|---|---|
| `demouser` | `demo123` |

The demo account signs in locally and skips the network round-trip, so you can explore the UI immediately.

### Available scripts

| Script | Description |
|---|---|
| `npm start` | Dev server with hot reload on port 3000 |
| `npm run build` | Production bundle → `build/` (minified, hashed) |
| `npm test` | Jest test runner in watch mode |
| `npm run eject` | Eject CRA configuration (one-way) |

### Smart contract (prototype)

```bash
npx hardhat compile
npx hardhat test
npx hardhat node                                   # local chain
npx hardhat run scripts/deploy.js --network <net>  # deploy
```

### Deployment

The React app is a static bundle deployed to **Vercel** at [medlink-tool.vercel.app](https://medlink-tool.vercel.app/). To build and serve it anywhere:

```bash
npm run build
npx serve -s build
```

The API is a Django REST service deployed on **DigitalOcean App Platform** behind the `medlink-zavgk.ondigitalocean.app` domain.

---

## Project Status

Honest breakdown of what is running vs. prototyped:

| Area | Status | Notes |
|---|---|---|
| React app shell, routing, auth | ✅ Shipped | Token auth, protected routes, persisted session |
| Dashboard, patients, records, community | ✅ Shipped | Fully wired to the REST API |
| AI Assistant | ✅ Shipped | Patient-scoped context, per-patient chat history |
| REST API | ✅ Built | Django REST Framework, deployed on DigitalOcean |
| IPFS record storage | ⚙️ Prototype | Record `url` field carries the CID/gateway link |
| On-chain consent contract | ⚙️ Prototype | Solidity `Upload` contract + Hardhat config exist in git history; reverted from `master` |
| Patient-side approval UI | 📋 Planned | Wallet connect, request inbox, approve/deny — not yet in the client |
| Doctor-side request flow | 📋 Planned | Request-from-profile entry point — not yet in the client |
| Contract test coverage | 📋 Needed | The suite in git history is Hardhat boilerplate, not tests for `Upload` |
| Automated client tests | ✅ Added | Smoke tests covering auth redirect, demo login, and protected-route access |

> ⚠️ **Note on the demo backend:** the live frontend at **medlink-tool.vercel.app** is up and running (the demo login and dashboard work end-to-end), but the hosted API domain is no longer serving traffic — the DNS record for `medlink-zavgk.ondigitalocean.app` has been released. Data-backed views (patient list, record timelines, community feed) therefore render their empty states rather than live records.
>
> To evaluate the app end-to-end, run the Django REST API locally and repoint the base URL in `src/` at it. The single place to change is `https://medlink-zavgk.ondigitalocean.app/api`, which is currently hardcoded across 10 files (see [Security Notes](#security-notes--known-limitations)).

---

## Security Notes & Known Limitations

This section is deliberate — these are real properties of the prototype, and the fixes are the next engineering tasks.

**Prototype contract**

- `add(user, url)` is callable by **any** address, so a third party could push entries into another patient's record list. Fix: restrict to `msg.sender == _user`, or require an approved-doctor check.
- Access is **all-or-nothing per patient**. There is no per-record granularity, so a doctor approved for one report can read the whole list.
- No **expiry** on consent — grants are permanent until manually revoked, which is wrong for "share for this consultation only."
- No **events** are emitted on grant/revoke, so external indexers and the UI cannot subscribe to permission changes. Adding `event AccessGranted` / `event AccessRevoked` is a small, high-value change.
- `add` writes raw strings; a CID-format check at write time would prevent unusable entries.
- The commit history contains the default Hardhat `Lock.js` test rather than tests targeting `Upload`.

**Application**

- The auth token is held in `localStorage`, which is readable by any XSS payload. A short-lived access token plus an httpOnly refresh cookie is the standard fix.
- Report URLs are rendered as links with `target="_blank"` — worth validating scheme and hostname to avoid `javascript:` URL injection.
- The API base URL is hardcoded across 10 files. It should live in a single environment-driven config module.
- The dashboard currently mixes live API data with hardcoded placeholder records (alerts, appointments, doctor profile, chart series).

---

## Roadmap

- [ ] **Patient-side wallet module** — connect, approve/deny incoming access requests, view and revoke active grants
- [ ] **Doctor-side request flow** — send an access request from a patient profile, track request state
- [ ] **Harden the contract** — restrict `add`, add per-record scoping, consent expiry, access events, CID validation
- [ ] **Real contract tests** — Hardhat suite covering grant, revoke, unauthorized read, and re-approval
- [ ] **IPFS pinning + gateway** — automated upload with content hashing and pinned CIDs
- [ ] **Environment config** — move the API base URL and keys into `.env`; remove hardcoded URLs
- [x] **Meaningful client tests** — smoke tests covering auth redirect, demo login, and protected-route access
- [ ] **Wider component coverage** — patient search, record rendering, and community post flows
- [ ] **Medical history timeline** — longitudinal view with filters by record type and date range
- [ ] **Audit log** — immutable trail of who viewed which record and when

---

## Acknowledgements

Built as a hackathon project exploring the intersection of **patient data ownership**, **decentralised storage**, and **smart-contract access control** in clinical practice.

Thanks to the doctors and reviewers who discussed clinical workflow and shaped the record model, and to the open-source community behind React, Tailwind CSS, Django, Solidity, Hardhat, and IPFS.

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 Amit Stredz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
