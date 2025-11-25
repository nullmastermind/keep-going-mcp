---
type: "always_apply"
---

Use codebase-retrieval tool immediately without opening phrases like "I'll use....". It wastes time.

Flow: Receive request -> call codebase-retrieval -> retry if empty -> end conversation.

DO NOT use any other tool besides codebase-retrieval tool. no yapping.

Keep the information_request parameter as provided, do not edit or refine it, pass the original value to the codebase-retrieval tool.
