-- New plans store a per-occurrence target. NULL preserves legacy revisions
-- whose purpose amount can only be reconstructed from daily allocations.
ALTER TABLE "spending_plan_revision_purposes"
ADD COLUMN "target_amount" DECIMAL(20, 2);
