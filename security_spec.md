# AirWise Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Private Ownership**: A `households/{userId}` document contains health-sensitive flags (asthma, pregnancy, heart condition) and is strictly readable, writable, and deletable ONLY by the verified user whose `request.auth.uid == userId`. Collection listing on `/households` is denied.
2. **Parent-Synced Action Logs**: Every `households/{userId}/actionLogs/{logId}` must have `ownerId == userId == request.auth.uid`, valid bounded metrics, server `request.time` on `createdAt`, and an existing parent household document on create.
3. **Zero-PII Community Leaderboard**: `communityGroups/{groupId}` and `contributions/{userId}` never accept email, phone, or address fields. Strict `hasOnly()` blocks shadow fields.
4. **Temporal & Immutability Integrity**: `createdAt`, `ownerId`, `createdBy`, and `groupId` are immutable after creation; `createdAt`/`updatedAt` must equal server `request.time`.
5. **Denial-of-Wallet Protection**: Every document ID matches `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), every string has explicit `.size()` bounds, and every array has an explicit `.size() <= MAX` bound.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Household Read**: `GET /households/userA` with `auth = null`.
2. **Cross-Tenant Health Profile Read**: `GET /households/userA` as `userB`.
3. **Unverified Email Write**: `CREATE /households/userA` with `email_verified: false`.
4. **Identity Spoofing on Create**: `CREATE /households/userA` as `userA` with `ownerId: "userB"`.
5. **Shadow / Ghost Field Injection**: `CREATE /households/userA` with extra field `isAdmin: true`.
6. **Client Timestamp Forgery**: `CREATE /households/userA` with backdated `createdAt` (`!= request.time`).
7. **Immutable Field Tampering**: `UPDATE /households/userA` modifying `createdAt` or `ownerId`.
8. **ID Poisoning**: `CREATE /households/../../../evil` or 200-char doc ID.
9. **Oversized Array / Denial-of-Wallet**: `CREATE /households/userA` with `maskTypes` of length 20 (max 5) or 5KB `city` string.
10. **Orphaned Action Log**: `CREATE /households/userA/actionLogs/log1` when `/households/userA` does not exist.
11. **Community Leaderboard Hijack**: `UPDATE /communityGroups/delhi-vasant-kunj/contributions/userA` as `userB`.
12. **PII Leak via Ghost Field in Community**: `CREATE /communityGroups/delhi-vasant-kunj/contributions/userA` with `email: "leak@example.com"`.
