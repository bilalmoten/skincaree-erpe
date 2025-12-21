import { z } from 'zod';

export const rawMaterialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  unit: z.string().min(1, 'Unit is required').max(50, 'Unit too long'),
  supplier: z.string().max(255, 'Supplier name too long').optional(),
  last_price: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Price must be a valid number'),
  category_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().max(10000, 'Notes too long').optional(),
});

export const finishedProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  sku: z.string().max(100, 'SKU too long').optional(),
  price: z.string().min(1, 'Price is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Price must be a valid number'),
  formulation_id: z.string().uuid().optional().or(z.literal('')),
  units_per_batch: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Units per batch must be a positive number'),
  shelf_life_days: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseInt(val);
    return !isNaN(num) && num > 0;
  }, 'Shelf life must be a positive number'),
  category_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().max(10000, 'Notes too long').optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50, 'Phone too long').optional(),
  address: z.string().max(1000, 'Address too long').optional(),
  notes: z.string().max(10000, 'Notes too long').optional(),
});

export const saleSchema = z.object({
  customer_id: z.string().uuid().optional().or(z.literal('')),
  sale_date: z.string().min(1, 'Sale date is required'),
  is_cash_paid: z.boolean().optional(),
  notes: z.string().max(10000, 'Notes too long').optional(),
  items: z.array(z.object({
    finished_product_id: z.string().uuid().min(1, 'Product is required'),
    quantity: z.string().refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num > 0;
    }, 'Quantity must be a positive number'),
    unit_price: z.string().refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Price must be a valid number'),
  })).min(1, 'At least one item is required'),
});

export const formulationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().max(10000, 'Description too long').optional(),
  batch_size: z.string().min(1, 'Batch size is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Batch size must be a positive number'),
  batch_unit: z.string().max(50, 'Unit too long').optional(),
  ingredients: z.array(z.object({
    raw_material_id: z.string().uuid().min(1, 'Raw material is required'),
    quantity: z.string().refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Quantity must be a positive number'),
    unit: z.string().min(1, 'Unit is required'),
  })).min(1, 'At least one ingredient is required'),
});

