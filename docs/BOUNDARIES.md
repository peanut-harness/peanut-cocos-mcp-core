# Core / Pro Boundary

`peanut-pod-lite` is the Cocos Creator editor product. It contains editor
contracts, capability policy, local approval, Creator hosts, Lumen, and the
subscription upgrade surface.

`peanut-pod-pro` is the paid edition. It contains signed-plan verification,
entitlement-gated workflows, and proprietary generators. It must not become a
second editor kernel.

Lite must never import Pro or rely on a private registry. Pro may only use
documented, versioned Lite APIs. Missing Pro, a signed-out account, or a failed
upgrade must not block Lite editor capabilities.

Lite may advertise paid operations and open a Pod Server checkout URL. It must
not execute those operations, accept a client-supplied entitlement, or treat a
subscription as a write approval. Billing webhooks on `peanut-pod-server` are
the only grant path.
