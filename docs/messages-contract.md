# Messages Contract

The conversation messages array follows strict rules. Violating these will cause the llama.cpp API to reject requests.

## Rules

1. **Array**: messages must be an array.
2. **Non-empty elements**: every element must have a non-empty `{ role, content }`.
3. **Valid roles**: role must be `"system"`, `"user"`, or `"assistant"`. Assistant messages come from the LLM API — never generate them in our code.
4. **One system message**: exactly one system message, and it must be first in the array.

## Guarded files

Before refactoring any of these, you MUST read this file and call out proposed changes to the user for approval:

- `src/services/llmService.js` — builds and sends messages to the LLM
- `src/routes/chatRoutes.js` — manages conversation state on POST
- `src/stores/conversationStore.js` — in-memory conversation store

## Verification

The mock LLM router in tests verifies this contract on every request. If a test fails with a contract violation error, fix the source of the violation — do not weaken the mock check.
