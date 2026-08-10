# ADR 0003: Preserve Spending Plan Revisions

## Status

Accepted

## Context

A Spending Plan compares recorded expenses with a daily allocation. Users can
adjust a plan while it is active, but an edit must not rewrite what the plan said
for a past day or change the meaning of spending that was already recorded.

## Decision

- Store a Spending Plan as a stable identity with its name, total amount, and
  planned date range.
- Store each editable Wallet Scope, Plan Purpose, category mapping, and daily
  allocation as a separate Plan Revision with an effective date.
- Allow a revision to take effect only on today or a future day within the plan.
- Select the latest Revision effective on each reported day when calculating
  planned and actual spending.
- Keep cancelled Plans and all their Revisions for history instead of deleting
  them.

## Consequences

The implementation performs more joins than an overwrite-in-place design and
the form must create a new Revision for an edit. In return, calendar views and
historical reports remain faithful to the plan a user had on each day.
