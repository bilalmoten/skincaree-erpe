# Skincare ERP Comprehensive Enhancement Plan

## Executive Summary

This plan addresses critical bugs, UI/UX improvements, missing features, and introduces a categorization system for raw materials and finished goods based on skincare/cosmetics industry standards. The system will better support the workflow: Raw Materials (Ingredients/Packaging) → Formulation → Bulk Product → Packaging → Finished Goods.

The plan is divided into three implementation stages:
- **Stage 1: Easy** - All priority items that are quick to implement
- **Stage 2: High Priority** - Important features that are not overly complex
- **Stage 3: Complex** - Advanced features requiring significant development effort

---

## Stage 1: Easy (All Priorities)

### Critical Bugs & Quick Fixes

#### 1. Sales API Missing `onConflict` for Inventory Updates
**File**: `app/api/sales/route.ts` (line 103-108)
**Issue**: Inventory upsert missing `onConflict` parameter, can cause errors
**Difficulty**: ⭐ (Very Easy)
**Fix**: Add `onConflict: 'finished_product_id'` to upsert call

#### 2. Customer Ledger Balance Calculation Bug
**File**: `app/api/customer-ledger/[customerId]/route.ts`
**Issue**: Balance calculation may be incorrect if multiple sales exist without proper ordering
**Difficulty**: ⭐⭐ (Easy)
**Fix**: Ensure proper ordering and calculation of running balance

#### 3. Missing Batch Unit Field in Formulations Schema
**File**: `supabase/schema.sql` (line 33)
**Issue**: `batch_unit` field referenced in code but missing from schema
**Difficulty**: ⭐ (Very Easy)
**Fix**: Add `batch_unit VARCHAR(50) DEFAULT 'g'` to formulations table

#### 4. Production Run Inventory Update Missing `onConflict`
**File**: `app/api/production/route.ts` (line 245-250)
**Issue**: Raw material inventory update missing `onConflict`
**Difficulty**: ⭐ (Very Easy)
**Fix**: Add `onConflict: 'raw_material_id'` to upsert

#### 5. No Validation for Negative Inventory
**Issue**: System allows negative inventory in some cases
**Difficulty**: ⭐⭐ (Easy)
**Fix**: Add validation checks before inventory deductions

### UI/UX Quick Wins

#### 6. Loading States Missing Throughout
**Files**: Multiple pages
**Issue**: Many operations lack loading feedback
**Difficulty**: ⭐⭐ (Easy)
**Changes**: Add loading spinners/disabled states to:
- Sales creation
- Customer creation/editing
- Formulation editing
- Excel imports/exports

#### 7. Error Messages Need Improvement
**Issue**: Generic alerts, no detailed error display
**Difficulty**: ⭐⭐ (Easy)
**Fix**: Create error toast/notification component with better messaging

#### 8. Form Validation Feedback
**Issue**: Forms don't show validation errors clearly
**Difficulty**: ⭐⭐ (Easy)
**Fix**: Add inline validation messages and highlight invalid fields

#### 9. Low Stock Alerts
**Difficulty**: ⭐⭐ (Easy)
**Description**: Re-introduce with configurable thresholds

**Database Changes**:
```sql
ALTER TABLE raw_materials ADD COLUMN min_stock_level DECIMAL(10, 3) DEFAULT 0;
ALTER TABLE finished_products ADD COLUMN min_stock_level INTEGER DEFAULT 0;
```

**Features**:
- Dashboard alerts
- Reorder suggestions

### Sales Enhancements

#### 10. Add Customer Info Option in Sales Form
**File**: `app/(dashboard)/sales/new/page.tsx`
**Difficulty**: ⭐⭐ (Easy)
**Description**: Allow creating customer on-the-fly during sale creation

**Implementation**:
- Add "New Customer" button/modal in sales form
- Create customer inline without leaving sales page
- Auto-select newly created customer

#### 11. Cash Payment Checkbox in Sales
**File**: `app/(dashboard)/sales/new/page.tsx`, `app/api/sales/route.ts`
**Difficulty**: ⭐ (Very Easy)
**Description**: Add checkbox to mark if sale is cash paid

**Database Changes**:
```sql
ALTER TABLE sales ADD COLUMN is_cash_paid BOOLEAN DEFAULT false;
```

**Implementation**:
- Add checkbox in sales form
- If cash paid, don't add to customer ledger
- Update sales list to show payment status

### Technical Improvements

#### 12. Input Sanitization & Validation
**Difficulty**: ⭐⭐ (Easy)
**Description**: Add proper validation and sanitization
**Implementation**: Use Zod or similar for schema validation

#### 13. Database Indexing Optimization
**Difficulty**: ⭐⭐ (Easy)
**Description**: Review and optimize indexes

---

## Stage 2: High Priority (Not Complex)

### Search and Filter Functionality

#### 14. Search and Filter on List Pages
**Issue**: No search/filter on list pages
**Difficulty**: ⭐⭐⭐ (Medium)
**Fix**: Add search bars and filters to:
- Raw Materials
- Finished Products
- Customers
- Sales
- Production Runs

### Material Categorization System

#### 15. Material Categorization System
**Difficulty**: ⭐⭐⭐⭐ (Medium-Hard)
**Description**: Add categories for raw materials and finished goods

**Database Changes**:
```sql
-- Categories table
CREATE TABLE material_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ingredient', 'packaging', 'bulk_product', 'finished_good')),
    parent_id UUID REFERENCES material_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add category_id to raw_materials
ALTER TABLE raw_materials ADD COLUMN category_id UUID REFERENCES material_categories(id);

-- Add category_id to finished_products  
ALTER TABLE finished_products ADD COLUMN category_id UUID REFERENCES material_categories(id);
```

**Category Types**:
- **Ingredient**: Active ingredients, preservatives, emulsifiers, oils, water, etc.
- **Packaging**: Jars, bottles, boxes, labels, caps, pumps
- **Bulk Product**: Intermediate products (e.g., "Moisturizer Cream Base")
- **Finished Good**: Final packaged products

**UI Changes**:
- Add category dropdowns in raw materials and finished products forms
- Category management page
- Filter by category in lists
- Category-based reports

### Expiry Date Tracking

#### 16. Expiry Date Tracking
**Difficulty**: ⭐⭐⭐ (Medium)
**Description**: Track expiry dates for finished products

**Database Changes**:
```sql
ALTER TABLE finished_products ADD COLUMN shelf_life_days INTEGER;
ALTER TABLE finished_product_inventory ADD COLUMN expiry_date DATE;
ALTER TABLE production_runs ADD COLUMN expiry_date DATE;
```

**Features**:
- Auto-calculate expiry dates based on production date + shelf life
- Alerts for expiring products
- FEFO (First Expired First Out) inventory management

### Advanced Reports

#### 17. Advanced Reports
**Difficulty**: ⭐⭐⭐ (Medium)
**Description**: Enhanced reporting capabilities

**New Reports**:
- Sales by product/customer/date range
- Production efficiency reports
- Inventory valuation reports
- Profit & loss statements
- Material usage reports

### Mobile Responsiveness

#### 18. Mobile Responsiveness
**Issue**: Tables and forms may not work well on mobile
**Difficulty**: ⭐⭐⭐ (Medium)
**Fix**: Improve responsive design, add mobile-friendly layouts

### Export to PDF

#### 19. Export to PDF
**Difficulty**: ⭐⭐⭐ (Medium)
**Description**: Export reports and invoices to PDF

**Implementation**: Use libraries like `pdfkit` or `jspdf`
**Features**:
- Sales invoices as PDF
- Reports as PDF
- Production run sheets

### Cost Tracking Enhancement

#### 20. Cost Tracking Enhancement
**Difficulty**: ⭐⭐⭐ (Medium)
**Description**: Better cost tracking and COGS calculation

**Features**:
- Average cost calculation for raw materials
- Production cost calculation (materials + overhead)
- COGS calculation for sales
- Profit margin reports

### Error Logging & Monitoring

#### 21. Error Logging & Monitoring
**Difficulty**: ⭐⭐⭐ (Medium)
**Description**: Proper error logging system

---

## Stage 3: Complex

### Bulk Product Management

#### 22. Bulk Product Management
**Difficulty**: ⭐⭐⭐⭐ (Medium-Hard)
**Description**: Support for intermediate/bulk products that are produced but not yet packaged

**Database Changes**:
```sql
CREATE TABLE bulk_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    formulation_id UUID REFERENCES formulations(id),
    unit VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE bulk_product_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bulk_product_id UUID NOT NULL REFERENCES bulk_products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bulk_product_id)
);
```

**Workflow**:
1. Production Run creates bulk product inventory
2. Packaging step converts bulk product + packaging materials → finished goods
3. Track both bulk and finished inventory separately

### Packaging Module

#### 23. Packaging Module
**Difficulty**: ⭐⭐⭐⭐ (Medium-Hard)
**Description**: Separate packaging step that uses bulk products + packaging materials

**Database Changes**:
```sql
CREATE TABLE packaging_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bulk_product_id UUID REFERENCES bulk_products(id),
    finished_product_id UUID REFERENCES finished_products(id),
    bulk_quantity_used DECIMAL(10, 3) NOT NULL,
    finished_units_produced INTEGER NOT NULL,
    packaging_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE packaging_materials_used (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    packaging_run_id UUID NOT NULL REFERENCES packaging_runs(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
    quantity_used DECIMAL(10, 3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**UI**: New "Packaging" page similar to Production page

### Data Backup & Restore

#### 24. Data Backup & Restore
**Difficulty**: ⭐⭐⭐⭐ (Medium-Hard)
**Description**: System backup and restore functionality

**Features**:
- Export all data to JSON/SQL
- Import backup
- Scheduled backups (future)
- Selective backup (by module)

### Data Reset Options

#### 25. Data Reset Options
**Difficulty**: ⭐⭐⭐⭐ (Medium-Hard)
**Description**: Allow resetting/deleting all data from specific modules

**Features**:
- Reset all productions
- Reset all formulations/ingredients
- Reset all raw materials
- Reset all finished products
- Reset all sales
- Reset all customers
- Full system reset (with confirmation)

**Implementation**:
- Add "Reset" section in settings/admin page
- Confirmation dialogs with warnings
- Option to export before reset
- Log reset actions

### Formula Versioning

#### 26. Formula Versioning
**Difficulty**: ⭐⭐⭐⭐ (Medium-Hard)
**Description**: Track formulation changes over time

**Database Changes**:
```sql
ALTER TABLE formulations ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE formulations ADD COLUMN parent_formulation_id UUID REFERENCES formulations(id);
```

**Features**:
- Version history
- Compare formulations
- Rollback to previous versions

### Batch/Lot Tracking

#### 27. Batch/Lot Tracking
**Difficulty**: ⭐⭐⭐⭐⭐ (Hard)
**Description**: Track batches/lots for traceability

**Database Changes**:
```sql
ALTER TABLE production_runs ADD COLUMN batch_number VARCHAR(100);
ALTER TABLE finished_product_inventory ADD COLUMN batch_number VARCHAR(100);
ALTER TABLE sales_items ADD COLUMN batch_number VARCHAR(100);
```

**Features**:
- Generate batch numbers automatically
- Track which batch was sold
- Expiry date tracking for finished products
- Recall capabilities

### Quality Control/Testing

#### 28. Quality Control/Testing
**Difficulty**: ⭐⭐⭐⭐ (Medium-Hard)
**Description**: Track QC tests and results

**Database Changes**:
```sql
CREATE TABLE quality_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_run_id UUID REFERENCES production_runs(id),
    test_type VARCHAR(100) NOT NULL,
    test_date DATE NOT NULL,
    result VARCHAR(50) CHECK (result IN ('pass', 'fail', 'pending')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Caching Strategy

#### 29. Caching Strategy
**Difficulty**: ⭐⭐⭐⭐ (Medium-Hard)
**Description**: Cache frequently accessed data

### API Rate Limiting

#### 30. API Rate Limiting
**Difficulty**: ⭐⭐⭐ (Medium)
**Description**: Prevent abuse

---

## Implementation Summary

### Stage 1: Easy (All Priorities)
- Items: #1-13
- Estimated Time: 2-3 weeks
- Focus: Bug fixes, quick UI improvements, sales enhancements

### Stage 2: High Priority (Not Complex)
- Items: #14-21
- Estimated Time: 4-6 weeks
- Focus: Search/filter, categorization, reports, PDF export

### Stage 3: Complex
- Items: #22-30
- Estimated Time: 8-12 weeks
- Focus: Advanced workflows, bulk products, packaging, backup/reset

---

## Notes

- All difficulty ratings are from a development perspective
- ⭐ = Very Easy (1-2 hours)
- ⭐⭐ = Easy (2-4 hours)
- ⭐⭐⭐ = Medium (1-2 days)
- ⭐⭐⭐⭐ = Medium-Hard (3-5 days)
- ⭐⭐⭐⭐⭐ = Hard (1+ weeks)

- Categories should be hierarchical (e.g., Packaging > Primary Packaging > Jars)
- Bulk products bridge the gap between formulations and finished goods
- Packaging step allows tracking of packaging material usage separately
- Reset options should include strong warnings and confirmation dialogs
- Backup should be done before any reset operations

