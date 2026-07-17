# ADR 0002: Immediate Session Revocation After Password Change

## Status

Accepted

## Context

Changing a password is a security-sensitive action. Revoking only Refresh Tokens
prevents future token renewal, but a stolen Access Token remains valid until its
expiry. Walpaca Access Tokens last eight hours, which is too long to describe the
result as logging out every device immediately.

## Decision

- Add `users.session_version`, starting at `0`.
- Include `sessionVersion` in every Access Token and Refresh Token.
- Verify the version against the User record in `JwtAuthGuard` for protected API
  requests.
- On a successful password change, update the password hash, increment
  `session_version`, and revoke active Refresh Tokens in one database transaction.
- Reject Refresh Tokens when used as Bearer tokens for protected endpoints.

## Consequences

Every prior session becomes unauthorized as soon as a password change commits,
including Access Tokens that have not reached their normal expiry. Protected API
requests perform one additional User lookup to validate the session version. Users
must sign in again after changing their password.
