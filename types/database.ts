export interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  supplier: string | null;
  last_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawMaterialInventory {
  id: string;
  raw_material_id: string;
  quantity: number;
  updated_at: string;
}

export interface Formulation {
  id: string;
  name: string;
  description: string | null;
  batch_size: number;
  created_at: string;
  updated_at: string;
}

export interface FormulationIngredient {
  id: string;
  formulation_id: string;
  raw_material_id: string;
  quantity: number;
  unit: string;
  created_at: string;
}

export interface FinishedProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  formulation_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinishedProductInventory {
  id: string;
  finished_product_id: string;
  quantity: number;
  updated_at: string;
}

export interface ProductionRun {
  id: string;
  formulation_id: string;
  batch_size: number;
  production_date: string;
  notes: string | null;
  created_at: string;
}

export interface ProductionMaterialUsed {
  id: string;
  production_run_id: string;
  raw_material_id: string;
  quantity_used: number;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  customer_id: string | null;
  sale_date: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  finished_product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface CustomerLedger {
  id: string;
  customer_id: string;
  sale_id: string | null;
  transaction_type: 'sale' | 'payment';
  amount: number;
  balance: number;
  transaction_date: string;
  notes: string | null;
  created_at: string;
}

