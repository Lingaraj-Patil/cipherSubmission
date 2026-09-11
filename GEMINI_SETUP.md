# Gemini Free-Tier Setup

1. Create a Gemini API key from Google AI Studio.
2. Set it only on the server:
   `GEMINI_API_KEY=...`
3. Default model:
   `gemini-2.5-flash`
4. Install:
   `npm install`
5. Test:
   `npm test`
6. Run:
   `npm start`

The browser never receives the API key. The server sends the problem, learner submission and fixed LLD rubric to Gemini and validates the returned JSON before saving the evaluation.

Check Google's current Gemini API pricing/limits before a live demo because free-tier quotas can change.
