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
