-- Add packaging/yield fields to finished_products table
-- This allows tracking how many finished units are produced from a batch
-- Example: 1kg batch produces 20 units of finished product

ALTER TABLE finished_products 
ADD COLUMN IF NOT EXISTS units_per_batch DECIMAL(10, 2) DEFAULT 1;

COMMENT ON COLUMN finished_products.units_per_batch IS 'Number of finished units produced from one batch_size unit of formulation. Example: If batch_size is 1kg and units_per_batch is 20, then 1kg = 20 finished units.';

