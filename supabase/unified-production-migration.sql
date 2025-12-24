-- Unified Production Migration
-- Run this in Supabase SQL Editor

-- 1. Modify formulation_ingredients to allow Bulk Products
ALTER TABLE formulation_ingredients ALTER COLUMN raw_material_id DROP NOT NULL;
ALTER TABLE formulation_ingredients ADD COLUMN IF NOT EXISTS bulk_product_id UUID REFERENCES bulk_products(id) ON DELETE CASCADE;

-- Add constraint to ensure one of them is present (use DO block to avoid error if exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingredient_check') THEN
        ALTER TABLE formulation_ingredients ADD CONSTRAINT ingredient_check CHECK (
            (raw_material_id IS NOT NULL AND bulk_product_id IS NULL) OR
            (raw_material_id IS NULL AND bulk_product_id IS NOT NULL)
        );
    END IF;
END $$;

-- 2. Enhance formulations to specify what they produce
ALTER TABLE formulations ADD COLUMN IF NOT EXISTS produces_type VARCHAR(20) CHECK (produces_type IN ('bulk', 'finished'));
ALTER TABLE formulations ADD COLUMN IF NOT EXISTS produces_id UUID; -- Can be bulk_product_id or finished_product_id

-- 3. Update existing production_runs to include output tracking if needed
-- (The production_runs table already exists and handles finished_products via links)

