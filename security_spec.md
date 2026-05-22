# Security Spec & Threat Modeling

## Core Invariants
1. Services (calibrations, alignments, rotations, balancings, inventory items) CANNOT belong to an unauthenticated operator. The document's `userId` must strictly match the authenticated user (`request.auth.uid`).
2. Timestamps must be system-validated via `request.time` (no client tampering).
3. IDs must fit strict constraints to guard against resource depletion (Denial of Wallet) and character-injection exploits.
4. Custom user profile editing cannot spoof email addresses or write unauthorized privileged fields.

## The Dirty Dozen Spoofing Payloads
1. **User Spoofing:** Creating `/users/malicious-id` with `uid = "legit-id"`.
2. **Ghost Records:** Submitting a service document where `userId = "victim-uid"`.
3. **Admin Privilege Escalation:** Adding `role: "admin"` on client creation.
4. **Temporal Manipulation:** Setting `createdAt` to a raw timestamp years in the past.
5. **ID Poisoning:** Ingesting a 50KB string as an alignment ID to deplete resource limits.
6. **Negative Inventory:** Creating inventory items with negative counts like `quantidade: -99999`.
7. **Client Trust Bypass:** Attempting a list query on all alignments without specifying a `where` filter for a specific owner ID.
8. **PII Harvesting:** Running a listing query on other operators' sensitive user documents.
9. **Status Shortcutting:** Changing an alignment status directly to `Alinhado` without proper technical fields.
10. **Shadow Updates:** Attempting to alter immutable metadata like `createdAt` or `id` post-creation.
11. **Malformed Fields:** Saving a calibration record where `pressaoAlvo` is a boolean instead of a number.
12. **Foreign Orphan Registration:** Creating a calibration record for a vehicle without checking format bounds of its plate.
