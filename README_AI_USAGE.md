# DesignLoop — LLD Practice Platform

A focused, end-to-end prototype for practicing Low-Level Design (LLD), submitting a structured design, receiving explainable rubric-based feedback, and reviewing attempt history.

## Why this MVP

The assignment asks for a learner journey of:

**Choose problem → Think/design → Submit → Get feedback → Review → Try again**

DesignLoop implements that loop without turning the project into an LMS or a large assessment system.

## Features

- 4 focused LLD problems: Parking Lot, Elevator System, Vending Machine, Library Management.
- Structured submission with requirements/assumptions, classes, relationships, behaviour, edge cases, and trade-offs.
- Submission persistence to `data/attempts.json`.
- Explicit evaluation lifecycle: `EVALUATING → COMPLETED / FAILED`.
- Real LLM evaluator through the Google Gemini API with strict structured JSON output and an 8-dimension rubric.
- Explainable criterion-level evidence and suggestions.
- Attempt history.
- Idempotency key to prevent accidental duplicate submissions.
- Domain classes (`Problem`, `Attempt`, `Rubric`, `Evaluation`) and an evaluator abstraction.
- Optional `LlmEvaluator` extension point; the local prototype does not require an API key.
- Node built-in tests for important state transitions and failure behaviour.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm test
npm start
```

Open `http://localhost:3000`.

No database or external service is required.

## Architecture

```text
Browser
  |
  | HTTP
  v
Node HTTP server
  |
  +--> Problem catalogue
  |
  +--> Attempt repository (JSON file for prototype)
  |
  +--> Evaluation service
          |
          +--> DeterministicEvaluator
          |
          +--> LlmEvaluator (extension point)
```

The prototype deliberately uses a simple monolith. The assignment explicitly says a simple monolith is acceptable and asks candidates not to spend most of their time on HLD concerns.

## Evaluation model

The baseline evaluator does not pretend that one reference solution is the only correct answer. It evaluates evidence across:

1. Requirement understanding
2. Class responsibilities
3. Coupling / cohesion
4. Encapsulation and interfaces
5. Appropriate abstraction / patterns
6. Extensibility
7. Edge cases and testability
8. Quality of explanation

The UI shows criterion-level evidence, concern and a concrete improvement suggestion.

### Deterministic vs AI

Deterministic checks are used for:
- Required sections
- Submission validation
- State transitions
- Duplicate/idempotency handling
- Basic evidence signals

An LLM is a better fit for:
- Responsibility quality
- Design trade-offs
- SOLID/abstraction analysis
- Candidate explanation quality
- Improvement suggestions

The `LlmEvaluator` interface is intentionally isolated so a future evaluator can be added without changing the practice flow.

## Failure handling

The submission is persisted before evaluation starts. Evaluation runs after the submit response, and the attempt has an explicit state.

Current prototype states exposed by the API/UI:
- `EVALUATING`
- `COMPLETED`
- `FAILED`

A failed evaluation does not delete the submission.

## Change tests

### Change A — new submission format

Today the prototype stores a structured text submission. If class-diagram support is added later, the `Attempt` should reference a submission representation rather than hard-code diagram concerns into the practice flow.

### Change B — another evaluator

The evaluator boundary allows a rule-based evaluator, LLM evaluator or human review adapter to produce a common evaluation shape.

## Limitations

- JSON persistence is intentionally lightweight; production would use a transactional database.
- Authentication and multi-user authorization are outside the 2-day MVP.
- The local baseline evaluator is heuristic, not a substitute for expert review.
- The LLM adapter is an extension point rather than a required external dependency.
- No distributed queue is introduced; the prototype keeps evaluation practical and local.

## Test coverage

Run:

```bash
npm test
```

Tests cover:
- Valid attempt lifecycle
- Invalid state transition rejection
- Prevention of re-evaluation after completion

## AI_USAGE.md

See the section below.

---

## AI evaluation setup

The prototype uses the Google Gemini API for the reasoning-heavy evaluation step. Keep the API key server-side.

```bash
export GEMINI_API_KEY="your_key_here"
export GEMINI_MODEL="gemini-2.5-flash"
npm install
npm test
npm start
```

Gemini receives the problem, learner submission and fixed rubric, then returns structured criterion results with score, evidence, concern, suggestion and confidence.

For a UI-only local demonstration without an API key, set `DEMO_MODE=true`. Do not present that mode as the actual AI evaluation path.


# AI_USAGE.md
# AI_USAGE.md

AI was used as an engineering copilot, not as a substitute for design judgement.

## Decision 1 — Keep the MVP monolithic

**AI suggestion:** Use a conventional web stack and avoid microservices for a 2-day assignment.

**Accepted:** Yes.

**Why:** The assignment explicitly prioritizes LLD/domain design and says a simple monolith is acceptable. Splitting services would add infrastructure without improving the learner loop.

## Decision 2 — Separate deterministic checks from judgement-heavy evaluation

**AI suggestion:** Use deterministic validation for required fields/state/idempotency and reserve an evaluator abstraction for reasoning-heavy feedback.

**Accepted:** Yes.

**Why:** This makes feedback more explainable and predictable while leaving room for an LLM later.

## Decision 3 — Do not use a single “AI score”

**AI suggestion:** Evaluate against a fixed rubric and return criterion-level evidence and suggestions.

**Accepted:** Yes.

**Why:** A raw score cannot teach a learner what to change. The assignment specifically encourages structured feedback tied to evidence.

## Decision 4 — Persist before evaluation

**AI suggestion:** Save the submission before starting evaluation and expose an explicit evaluation state.

**Accepted:** Yes.

**Why:** If evaluation is slow or fails, the learner's work must not disappear. This also keeps the submit request independent from evaluator latency.

## Decision 5 — Use an extension point for future LLM evaluation

**AI suggestion:** Define an evaluator boundary so rule-based, LLM and human evaluators can coexist later.

**Accepted:** Yes.

**Why:** The assignment asks how another evaluation approach could be added without rewriting the practice flow. The evaluator boundary is the smallest useful abstraction.

## What was deliberately rejected

- Microservices, queues and Kubernetes: unnecessary for the scope.
- A large LMS/dashboard: does not improve the core practice loop.
- A class-diagram editor in the first MVP: valuable later, but text provides enough evidence for a focused 2-day prototype.
- A reference-answer matcher: risks implying that one valid LLD design is the only correct design.
- An unconstrained LLM prompt such as “give a score out of 100”: low explainability and inconsistent feedback.

## AI transparency

The implementation, wording and design were reviewed and adapted rather than copied blindly. The final architecture is intentionally small enough to explain class-by-class during a review.

## Real AI evaluator implementation

The final prototype uses the Google Gemini API on the server for the judgement-heavy portion of evaluation. The model is constrained by a strict JSON Schema containing eight rubric criteria and must provide evidence, concern, suggestion and confidence for each criterion.

The API key is read from `GEMINI_API_KEY` and is never placed in frontend code. The selected model defaults to `gemini-2.5-flash` and can be changed with `GEMINI_MODEL`.

The deterministic layer remains responsible for submission validation and lifecycle/idempotency behaviour. This separation follows the assignment's guidance that deterministic checks and judgement-heavy AI checks should not be conflated.
