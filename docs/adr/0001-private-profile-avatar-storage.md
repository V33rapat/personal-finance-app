# ADR 0001: Private Storage For Profile Avatars

## Status

Accepted

## Context

Profile avatars are user-owned files and should not be readable by anyone who
only discovers a permanent URL. The application already uses a Next.js BFF
and a NestJS Backend, so browser uploads can stay behind that boundary.

## Decision

- Store avatars in a private Supabase Storage bucket named `avatars`.
- Let the Backend use the Supabase service-role key; never expose it to the browser.
- Store the Storage object path in `users.avatar_path`.
- Return a one-hour Signed URL as `avatarUrl` when the Profile is read.
- Upload and delete files through authenticated Backend endpoints.

## Consequences

Private storage prevents permanent public access, but Signed URLs expire. The
Profile flow must fetch the Profile again when a fresh URL is needed. Storage
cleanup is best-effort because a database transaction cannot include a remote
Storage operation.
