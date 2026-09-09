# Core / Pro Boundary

`peanut-cocos-mcp-core` is the public foundation. It contains protocol contracts, input validation, capability policy primitives, safe execution abstractions, and test fixtures.

`peanut-cocos-mcp-pro` is private. It contains signed-plan verification, entitlement enforcement, advanced Cocos workflows, proprietary rules, and encrypted rule-pack delivery.

Core must never import Pro or rely on a private registry. Pro may only use documented, versioned Core APIs.
