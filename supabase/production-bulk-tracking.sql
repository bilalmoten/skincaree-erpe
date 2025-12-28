-- Migration to support bulk products in production tracking
-- Run this in Supabase SQL Editor

-- Add bulk_product_id to production_materials_used
ALTER TABLE production_materials_used 
ADD COLUMN IF NOT EXISTS bulk_product_id UUID REFERENCES bulk_products(id) ON DELETE RESTRICT;

-- Make raw_material_id nullable
ALTER TABLE production_materials_used 
ALTER COLUMN raw_material_id DROP NOT NULL;

-- Add check constraint
ALTER TABLE production_materials_used
DROP CONSTRAINT IF EXISTS check_material_or_bulk;

ALTER TABLE production_materials_used
ADD CONSTRAINT check_material_or_bulk CHECK (
  (raw_material_id IS NOT NULL AND bulk_product_id IS NULL) OR
  (raw_material_id IS NULL AND bulk_product_id IS NOT NULL)
);

-- Add index for bulk_product_id
CREATE INDEX IF NOT EXISTS idx_production_materials_used_bulk_product_id 
ON production_materials_used(bulk_product_id);

