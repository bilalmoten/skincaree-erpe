-- Skincare ERP Enhancement Migrations
-- Run these SQL statements in Supabase SQL Editor
-- Execute in order, section by section

-- ============================================================================
-- STAGE 1: EASY (All Priorities)
-- ============================================================================

-- 1. Add batch_unit to formulations table
ALTER TABLE formulations ADD COLUMN IF NOT EXISTS batch_unit VARCHAR(50) DEFAULT 'g';

-- 2. Add min_stock_level to raw_materials
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS min_stock_level DECIMAL(10, 3) DEFAULT 0;

-- 3. Add min_stock_level to finished_products
ALTER TABLE finished_products ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 0;

-- 4. Add is_cash_paid to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_cash_paid BOOLEAN DEFAULT false;

-- ============================================================================
-- STAGE 2: HIGH PRIORITY (Not Complex)
-- ============================================================================

-- 5. Create material_categories table
CREATE TABLE IF NOT EXISTS material_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ingredient', 'packaging', 'bulk_product', 'finished_good')),
    parent_id UUID REFERENCES material_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add category_id to raw_materials
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES material_categories(id);

-- 7. Add category_id to finished_products
ALTER TABLE finished_products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES material_categories(id);

-- 8. Add expiry date tracking columns
ALTER TABLE finished_products ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER;
ALTER TABLE finished_product_inventory ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE production_runs ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_raw_materials_category_id ON raw_materials(category_id);
CREATE INDEX IF NOT EXISTS idx_finished_products_category_id ON finished_products(category_id);
CREATE INDEX IF NOT EXISTS idx_material_categories_type ON material_categories(type);
CREATE INDEX IF NOT EXISTS idx_finished_product_inventory_expiry_date ON finished_product_inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_sales_is_cash_paid ON sales(is_cash_paid);

-- ============================================================================
-- STAGE 3: COMPLEX
-- ============================================================================

-- 10. Create bulk_products table
CREATE TABLE IF NOT EXISTS bulk_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    formulation_id UUID REFERENCES formulations(id),
    unit VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Create bulk_product_inventory table
CREATE TABLE IF NOT EXISTS bulk_product_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bulk_product_id UUID NOT NULL REFERENCES bulk_products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bulk_product_id)
);

-- 12. Create packaging_runs table
CREATE TABLE IF NOT EXISTS packaging_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bulk_product_id UUID REFERENCES bulk_products(id),
    finished_product_id UUID REFERENCES finished_products(id),
    bulk_quantity_used DECIMAL(10, 3) NOT NULL,
    finished_units_produced INTEGER NOT NULL,
    packaging_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Create packaging_materials_used table
CREATE TABLE IF NOT EXISTS packaging_materials_used (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    packaging_run_id UUID NOT NULL REFERENCES packaging_runs(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
    quantity_used DECIMAL(10, 3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Add batch_number columns for lot tracking
ALTER TABLE production_runs ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE finished_product_inventory ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE sales_items ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);

-- 15. Add formula versioning columns
ALTER TABLE formulations ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE formulations ADD COLUMN IF NOT EXISTS parent_formulation_id UUID REFERENCES formulations(id);

-- 16. Create quality_tests table
CREATE TABLE IF NOT EXISTS quality_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_run_id UUID REFERENCES production_runs(id),
    test_type VARCHAR(100) NOT NULL,
    test_date DATE NOT NULL,
    result VARCHAR(50) CHECK (result IN ('pass', 'fail', 'pending')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_bulk_products_formulation_id ON bulk_products(formulation_id);
CREATE INDEX IF NOT EXISTS idx_bulk_product_inventory_bulk_product_id ON bulk_product_inventory(bulk_product_id);
CREATE INDEX IF NOT EXISTS idx_packaging_runs_bulk_product_id ON packaging_runs(bulk_product_id);
CREATE INDEX IF NOT EXISTS idx_packaging_runs_finished_product_id ON packaging_runs(finished_product_id);
CREATE INDEX IF NOT EXISTS idx_packaging_materials_used_packaging_run_id ON packaging_materials_used(packaging_run_id);
CREATE INDEX IF NOT EXISTS idx_packaging_materials_used_raw_material_id ON packaging_materials_used(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_quality_tests_production_run_id ON quality_tests(production_run_id);
CREATE INDEX IF NOT EXISTS idx_production_runs_batch_number ON production_runs(batch_number);
CREATE INDEX IF NOT EXISTS idx_finished_product_inventory_batch_number ON finished_product_inventory(batch_number);

-- 18. Enable RLS on new tables
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_materials_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_tests ENABLE ROW LEVEL SECURITY;

-- 19. Create RLS policies for new tables (allow all for single user)
CREATE POLICY "Allow all operations" ON material_categories FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON bulk_products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON bulk_product_inventory FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON packaging_runs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON packaging_materials_used FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON quality_tests FOR ALL USING (true);

-- ============================================================================
-- HELPER FUNCTIONS AND TRIGGERS
-- ============================================================================

-- 20. Function to update bulk_product_inventory updated_at
CREATE OR REPLACE FUNCTION update_bulk_product_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 21. Trigger for bulk_product_inventory updated_at
CREATE TRIGGER update_bulk_product_inventory_updated_at 
    BEFORE UPDATE ON bulk_product_inventory
    FOR EACH ROW EXECUTE FUNCTION update_bulk_product_inventory_updated_at();

-- 22. Function to auto-calculate expiry date for finished_product_inventory
CREATE OR REPLACE FUNCTION calculate_expiry_date()
RETURNS TRIGGER AS $$
DECLARE
    shelf_life INTEGER;
BEGIN
    -- Get shelf_life_days from finished_products
    SELECT fp.shelf_life_days INTO shelf_life
    FROM finished_products fp
    WHERE fp.id = NEW.finished_product_id;
    
    -- If shelf_life exists and expiry_date is not set, calculate it
    IF shelf_life IS NOT NULL AND shelf_life > 0 AND NEW.expiry_date IS NULL THEN
        -- Get production_date from production_runs if batch_number exists
        -- Otherwise use current date
        NEW.expiry_date = CURRENT_DATE + (shelf_life || ' days')::INTERVAL;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 23. Trigger for auto-calculating expiry dates (optional - can be handled in application)
-- CREATE TRIGGER calculate_finished_product_expiry_date
--     BEFORE INSERT OR UPDATE ON finished_product_inventory
--     FOR EACH ROW EXECUTE FUNCTION calculate_expiry_date();

-- ============================================================================
-- DATA SEEDING (Optional - for initial categories)
-- ============================================================================

-- 24. Insert default material categories (optional - run if needed)
-- Ingredient Categories
INSERT INTO material_categories (name, type) VALUES 
    ('Active Ingredients', 'ingredient'),
    ('Preservatives', 'ingredient'),
    ('Emulsifiers', 'ingredient'),
    ('Oils & Butters', 'ingredient'),
    ('Water & Solvents', 'ingredient'),
    ('Thickeners', 'ingredient'),
    ('Fragrances', 'ingredient'),
    ('Colorants', 'ingredient')
ON CONFLICT (name) DO NOTHING;

-- Packaging Categories
INSERT INTO material_categories (name, type) VALUES 
    ('Primary Packaging', 'packaging'),
    ('Secondary Packaging', 'packaging'),
    ('Labels', 'packaging'),
    ('Caps & Closures', 'packaging'),
    ('Pumps & Dispensers', 'packaging')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- NOTES
-- ============================================================================

-- Execute migrations in stages:
-- 1. Stage 1 migrations can be run immediately
-- 2. Stage 2 migrations should be run after Stage 1 is complete
-- 3. Stage 3 migrations should be run after Stage 2 is complete

-- Always backup your database before running migrations
-- Test migrations on a development database first

-- Some columns use IF NOT EXISTS to prevent errors if already added
-- RLS policies assume single-user setup - adjust if adding authentication

