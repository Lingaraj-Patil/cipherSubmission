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
