# Core / Pro Boundary

`peanut-pod-lite` is the public foundation. It contains protocol contracts, input validation, capability policy primitives, safe execution abstractions, and test fixtures.

`peanut-cocos-mcp-pro` is private. It contains signed-plan verification, entitlement enforcement, advanced Cocos workflows, proprietary rules, and encrypted rule-pack delivery.

Core must never import Pro or rely on a private registry. Pro may only use documented, versioned Core APIs.

The initial public catalog is deliberately read-only and fail-closed. Existing write operations, Lumen mutation operations, import orchestration, build execution, and workflow composition remain in the legacy source until they have a reviewed Pro migration target.
