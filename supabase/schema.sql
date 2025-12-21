-- Skincare Brand Management System Database Schema
-- Run these queries in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Raw Materials Table
CREATE TABLE IF NOT EXISTS raw_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    supplier VARCHAR(255),
    last_price DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Raw Material Inventory Table
CREATE TABLE IF NOT EXISTS raw_material_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(raw_material_id)
);

-- Formulations Table
CREATE TABLE IF NOT EXISTS formulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    batch_size DECIMAL(10, 3) NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Formulation Ingredients Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS formulation_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formulation_id UUID NOT NULL REFERENCES formulations(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(formulation_id, raw_material_id)
);

-- Finished Products Table
CREATE TABLE IF NOT EXISTS finished_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    formulation_id UUID REFERENCES formulations(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Finished Product Inventory Table
CREATE TABLE IF NOT EXISTS finished_product_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finished_product_id UUID NOT NULL REFERENCES finished_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(finished_product_id)
);

-- Production Runs Table
CREATE TABLE IF NOT EXISTS production_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formulation_id UUID NOT NULL REFERENCES formulations(id) ON DELETE RESTRICT,
    batch_size DECIMAL(10, 3) NOT NULL,
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production Materials Used Table
CREATE TABLE IF NOT EXISTS production_materials_used (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_run_id UUID NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
    quantity_used DECIMAL(10, 3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Items Table
CREATE TABLE IF NOT EXISTS sales_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    finished_product_id UUID NOT NULL REFERENCES finished_products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Ledger Table (for tracking payments and balances)
CREATE TABLE IF NOT EXISTS customer_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('sale', 'payment')),
    amount DECIMAL(10, 2) NOT NULL,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_raw_material_inventory_raw_material_id ON raw_material_inventory(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_formulation_ingredients_formulation_id ON formulation_ingredients(formulation_id);
CREATE INDEX IF NOT EXISTS idx_formulation_ingredients_raw_material_id ON formulation_ingredients(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_finished_product_inventory_finished_product_id ON finished_product_inventory(finished_product_id);
CREATE INDEX IF NOT EXISTS idx_production_runs_formulation_id ON production_runs(formulation_id);
CREATE INDEX IF NOT EXISTS idx_production_materials_used_production_run_id ON production_materials_used(production_run_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_sale_id ON customer_ledger(sale_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_raw_materials_updated_at BEFORE UPDATE ON raw_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formulations_updated_at BEFORE UPDATE ON formulations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finished_products_updated_at BEFORE UPDATE ON finished_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - can be configured later
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulation_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_materials_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;

-- For single user, allow all operations (adjust based on your auth setup)
-- You can modify these policies later when you add authentication
CREATE POLICY "Allow all operations" ON raw_materials FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON raw_material_inventory FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON formulations FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON formulation_ingredients FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON finished_products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON finished_product_inventory FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON production_runs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON production_materials_used FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sales FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sales_items FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON customer_ledger FOR ALL USING (true);

