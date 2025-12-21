-- Stage 3 Migration: Bulk Products, Packaging, Batch Tracking, and Enhanced Features
-- Run this SQL in Supabase SQL Editor

-- Bulk Products Table
CREATE TABLE IF NOT EXISTS bulk_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    formulation_id UUID REFERENCES formulations(id),
    unit VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulk Product Inventory Table
CREATE TABLE IF NOT EXISTS bulk_product_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bulk_product_id UUID NOT NULL REFERENCES bulk_products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bulk_product_id)
);

-- Packaging Runs Table
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

-- Packaging Materials Used Table
CREATE TABLE IF NOT EXISTS packaging_materials_used (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    packaging_run_id UUID NOT NULL REFERENCES packaging_runs(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
    quantity_used DECIMAL(10, 3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add batch tracking to production runs
ALTER TABLE production_runs ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE production_runs ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Add batch tracking to finished product inventory
ALTER TABLE finished_product_inventory ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE finished_product_inventory ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE finished_product_inventory ADD COLUMN IF NOT EXISTS production_date DATE;

-- Add batch tracking to sales items
ALTER TABLE sales_items ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);

-- Batch Tracking Table
CREATE TABLE IF NOT EXISTS batch_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(100) NOT NULL UNIQUE,
    production_run_id UUID REFERENCES production_runs(id),
    finished_product_id UUID REFERENCES finished_products(id),
    quantity_produced INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    production_date DATE NOT NULL,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'recalled', 'depleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add expiry date tracking
ALTER TABLE finished_products ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER;

-- Enhanced Cost Tracking
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS average_cost DECIMAL(10, 2);
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS last_purchase_cost DECIMAL(10, 2);

-- Cost History Table
CREATE TABLE IF NOT EXISTS cost_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_material_id UUID REFERENCES raw_materials(id),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    cost_per_unit DECIMAL(10, 2) NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    purchase_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add overhead costs to production
ALTER TABLE production_runs ADD COLUMN IF NOT EXISTS overhead_cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE production_runs ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(10, 2) DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bulk_products_formulation ON bulk_products(formulation_id);
CREATE INDEX IF NOT EXISTS idx_packaging_runs_bulk_product ON packaging_runs(bulk_product_id);
CREATE INDEX IF NOT EXISTS idx_packaging_runs_finished_product ON packaging_runs(finished_product_id);
CREATE INDEX IF NOT EXISTS idx_batch_tracking_batch_number ON batch_tracking(batch_number);
CREATE INDEX IF NOT EXISTS idx_batch_tracking_status ON batch_tracking(status);
CREATE INDEX IF NOT EXISTS idx_cost_history_raw_material ON cost_history(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_cost_history_purchase_order ON cost_history(purchase_order_id);

