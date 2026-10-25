# Production preparation: ordered backlog and decision register

**23 October 2026 · Planning only.** This adds sequencing to the [proposal](/home/reginaldkyalo/codes/api_phones_scraper/docs/production-readiness-2026-10-23/proposal.md); it does not mark implementation complete.

## Recommended work order

| Order / ID | Deliverable | Dependency | Evidence required to close |
|---|---|---|---|
| 1 · PF-01 | Deterministic quality/navigation test baseline | Current source and intended navigation contract | Three existing failures reconciled; meaningful regression cases pass |
| 2 · PF-02 | Reliable report service | PF-01; proposed D1 launch profile | Strict validation, atomic writes, safe retries, validated receipt, migration/browser checks |
| 3 · PF-03 | Safe catalogue publication | Current private-mode implementation | Immutable content versions; verified activation/rollback; coordinated HTML/API versions; raw-data checks on all hosts |
| 4 · PF-04 | Launch data contract and monitored refresh | Upstream access, data owner, approved sources | Per-offer identity/time/condition; measured quality/freshness; source-failure monitoring; approved release subset |
| 5 · PF-05 | Release automation and environment isolation | PF-01–04 | Reproducible tested artifact; safe bindings/secrets; staging promotion; no production side effects in tests |
| 6 · PF-06 | Complete shopping journeys and accessibility | Stable data contract and release candidate | Mobile/desktop flows, storage failure, keyboard/screen reader, both themes, zoom and recovery evidence |
| 7 · PF-07 | Production SEO and domain | Verified domain; PF-03/04 | Correct statuses/canonicals/sitemap, real rendered checks, supported product schema and old-URL policy |
| 8 · PF-08 | Security and abuse controls | Platform inventory; representative traffic | Scoped security review, headers on static/Function paths, dependency triage, no private-data bypass, fair limits |
| 9 · PF-09 | Performance, capacity and cost | Stable staging release; budget | Device/lab baseline, approved staging load profile, measured query/storage costs and spend alerts |
| 10 · PF-10 | Business/privacy/support readiness | Owner-supplied facts; chosen services | Working mailbox, complete disclosures, retention/deletion tests, source/image rights and report triage |
| 11 · PF-11 | Monitoring, incident response and restore | Owners; production-equivalent services | Alert delivery, versioned logs, service/data-age metrics, restore/rollback drills |
| 12 · PF-12 | Controlled beta and expansion decision | All applicable launch gates | Minimum observation window plus sufficient evidence; no unresolved launch blockers |

Order means implementation/review priority, not that every investigation must wait. Data-source verification, domain/business facts, operational ownership and platform inventory should begin immediately alongside PF-01/02. They can become the critical path even if the code is ready first.

The [phase-one implementation plan](/home/reginaldkyalo/codes/api_phones_scraper/docs/superpowers/plans/2026-10-23-production-foundation-phase-one.md) fully develops PF-01/02 and their own CI/staging evidence. PF-03 onward needs a separate scoped implementation plan before application changes; the earlier scraping plan must be reconciled against the already-implemented commit.

## Decisions and facts to record

No answer is fabricated below. The recommendation is enough to prepare work; the named fact must be established before its dependent release action.

| Item | Proposed default / fact needed | Blocks |
|---|---|---|
| Public release scope | Comparison-first; accounts, notifications, payments and ads disabled | G0 launch scope acceptance |
| Canonical domain | Actual owned and configured domain; current brand source marks its value as a placeholder | Domain redirects, Search Console and final policy publication |
| Legal operator and contact | Real entity/contact details and working mailbox | Public business/privacy sign-off |
| Catalogue subset | Categories/retailers passing the quality and freshness gates; not selected solely by size | Data publication scope |
| Collection authority/capacity | Named upstream owner, supported sources/rights, measured refresh feasibility | Claims that prices are current and sustainable catalogue coverage |
| Report storage | D1 as first-launch record of truth; no webhook-only production dependency | Final service configuration and migration rehearsal |
| Cloudflare account capabilities | Actual plan, bindings, rule inventory and preview/old deployment hosts | Deployable abuse policy, backup/recovery and cost expectations |
| Operational staffing | Named person responsible for incidents, data and report triage; coverage hours | Support promises and launch sign-off |
| Budget | Owner-approved monthly spend envelope and alert recipients | Paid services and capacity commitments |
| Privacy/retention | Actual processing inventory and reviewed retention/deletion rules | Logging, report retention and analytics activation |

## Work that can proceed without those facts

The deterministic test correction, offline report parser/store/client tests, additive migration design, local fault injection, existing-journey regression coverage and artifact inspection can proceed once implementation is authorised. They do not require production credentials or a final domain.

Do not make policy text appear complete by inventing a company address, retention period, mailbox operation or provider agreement. Do not enable a notification feature merely because a frontend button and an old scheduler file exist.

## Release evidence record

For each completed item, record:

- ID, responsible person, source commit, dataset/configuration/schema versions and test environment.
- Acceptance result, evidence location, known limitations and any narrowly scoped exception with an expiry date.
- Dependencies still open and whether they block staging, controlled beta or wider launch.
- Rollback steps and the person authorised to execute them.

Use **planned → implemented locally → verified in staging → verified in production** as distinct states. An item can be implemented and still block launch. A successful local test never automatically marks the production column green.

## Completion boundary

The first package is complete when the baseline is green and reports are safely validated, persisted and acknowledged through local and staging evidence. The website is ready for a controlled production launch only after the broader proposal's gates pass. Feature expansion and nationwide-scale claims remain separate decisions supported by measured operation.
