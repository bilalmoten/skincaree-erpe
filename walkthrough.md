# Skincare ERP - Detailed Project Walkthrough

## Summary

The Skincare ERP is a comprehensive, full-stack management system designed specifically for skincare brands. It manages the entire lifecycle of a product—from raw material procurement and recipe formulation to multi-stage manufacturing (bulk and packaging), sales, and financial tracking through a customer ledger.

**Key Features:**

- **End-to-End Inventory Tracking**: Real-time stock management for Raw Materials, Bulk Products, and Finished Goods.
- **Multi-Stage Production**: Supports a two-step manufacturing process (Production of Bulk -> Packaging into Finished Goods).
- **Formulation Management**: Detailed recipe tracking with automatic cost calculation (COGS) based on current ingredient prices.
- **Sales & CRM**: Integrated sales system with support for partial payments, customer ledgers, and automated inventory deduction.
- **Lot & Batch Tracking**: Full traceability of production batches with expiry date monitoring and quality status.
- **Financial Analytics**: Cost tracking, profit margin analysis, and detailed sales/production reports.
- **Data Portability**: Excel-based import/export templates for all major modules and system-wide backup/restore capabilities.

---

## How It Works: The Product Lifecycle

The software is built around a logical flow that mimics real-world manufacturing and retail operations.

### 1. Procurement (Raw Materials)

Everything starts with **Raw Materials**. These include:

- **Ingredients**: Oils, actives, preservatives, etc.
- **Packaging**: Bottles, labels, caps, pumps.

Users manage these in the `Raw Materials` module. Inventory is increased by recording **Purchases** (Purchase Orders), which also updates the `last_purchase_cost` and `average_cost` for accurate financial reporting.

### 2. Research & Development (Formulations)

A **Formulation** is a recipe. It defines which raw materials (ingredients) are used and in what quantities to create a specific amount of product (Batch Size).

- The system automatically calculates the **Cost of Goods Sold (COGS)** for a formulation based on the latest raw material prices.

### 3. Manufacturing (Production & Packaging)

The system supports a sophisticated two-step manufacturing flow:

- **Production Runs**: Raw materials are consumed to create a **Bulk Product** (e.g., 50kg of "Lavender Lotion").
- **Packaging Runs**: The Bulk Product is combined with packaging materials (e.g., 50kg of lotion + 200 bottles + 200 pumps + 200 labels) to create **Finished Products** (e.g., 200 units of "Lavender Lotion 250ml").

### 4. Sales & Distribution

Once a **Finished Product** is in stock, it can be sold via the **Sales** module.

- Creating a sale automatically deducts the required units from the `Finished Product Inventory`.
- Sales can be marked as **Cash Paid** or linked to a **Customer Ledger** for installment payments.

---

## Module Walkthrough

### 📊 Dashboard

The "command center" of the ERP. It provides real-time insights into:

- Monthly sales revenue and trends.
- Recent production activity.
- Inventory alerts (low stock of raw materials or finished goods).
- Pending payments from customers.

### 🧪 Formulations & Bulk Products

- **Formulations**: Manage recipes with versioning support.
- **Bulk Products**: Tracks intermediate storage of unpackaged goods. This is crucial for brands that manufacture in large batches but package on demand.

### 📦 Production & Packaging

- **Production**: Links formulations to raw material consumption. Supports lot numbering (Batch Numbers) for quality control.
- **Packaging**: Dedicated module to convert bulk into sellable units. Tracks packaging material wastage and efficiency.

### 🏷️ Finished Products & Inventory

- **Finished Products**: The final sellable items with unique SKUs and pricing.
- **Batch Tracking**: View specific production lots, their production dates, expiry dates, and remaining shelf life.

### 👥 Customers & Ledger

- **Customer Profiles**: Basic CRM functionality to track contact info and purchase history.
- **Ledger**: A sophisticated financial tool that tracks every transaction. If a customer pays partially, the ledger maintains a running balance, showing exactly how much is owed.

### 📈 Reports

- **Inventory Reports**: Value of current stock on hand.
- **Sales Reports**: Best-selling products and monthly revenue.
- **Production Reports**: Manufacturing efficiency and material usage.

### ⚙️ System & Settings

- **Categories**: Organize materials and products into logical groups.
- **Backup/Restore**: Export the entire database state or reset the system for a fresh start.
- **Excel Templates**: Standardized templates to bulk-upload data.

---

## Technical Architecture

- **Frontend**: Built with **Next.js 16.1** using the **App Router** for a fast, modern user experience.
- **Styling**: **Tailwind CSS** with **Radix UI** components for a professional, responsive interface.
- **Backend**: **Supabase (PostgreSQL)** handles data persistence, real-time updates, and Row Level Security (RLS).
- **Logic**:
  - **Cost Tracking**: Utilities in `lib/utils/cost-tracking.ts` calculate COGS and profit margins.
  - **Validation**: **Zod** ensures data integrity across all forms and API routes.
  - **Excel Processing**: **SheetJS (xlsx)** powers the robust import/export system.
- **API Layer**: A comprehensive set of Next.js Route Handlers (`app/api/`) manages the communication between the UI and the database, including complex operations like system resets and bulk imports.

---

## Key Data Flow Summary

1.  **Purchase** -> 🟢 Increases `Raw Material Inventory`
2.  **Production** -> 🔴 Decreases `Raw Material Inventory` | 🟢 Increases `Bulk Product Inventory`
3.  **Packaging** -> 🔴 Decreases `Bulk Product Inventory` & `Packaging Material Inventory` | 🟢 Increases `Finished Product Inventory`
4.  **Sale** -> 🔴 Decreases `Finished Product Inventory` | 🟢 Updates `Customer Ledger` & `Revenue`

