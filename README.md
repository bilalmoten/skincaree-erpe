# Skincare Brand Management System

A comprehensive ERP system for managing a skincare brand's operations, built with Next.js 16.1 and Supabase.

## Features

- **Raw Materials Management**: Track raw materials, inventory, suppliers, and last purchase prices
- **Formulations**: Manage product recipes with ingredients and batch sizes
- **Finished Products**: Track finished products with SKU, pricing, and inventory
- **Production Runs**: Create production batches, track materials used, and update inventory automatically
- **Sales Management**: Simple bill creation with automatic inventory deduction
- **Customer Management**: Customer database with contact information
- **Customer Ledger**: Track payments and balances for customers who pay in installments
- **Reports**: Sales, inventory, and production reports
- **Excel Import/Export**: Import and export data with templates for all modules
- **Dashboard**: Overview of key metrics and recent activity

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)

### 2. Database Setup

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor in your Supabase dashboard
3. Copy and paste the contents of `supabase/schema.sql` into the SQL Editor
4. Run the SQL script to create all tables, indexes, and policies

### 3. Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Get your Supabase credentials:
   - Go to your Supabase project settings
   - Navigate to API settings
   - Copy your Project URL and anon/public key

3. Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Getting Started

1. **Set up Raw Materials**: Add your raw materials with suppliers and last purchase prices
2. **Create Formulations**: Define product recipes with ingredients and quantities
3. **Add Finished Products**: Create products linked to formulations
4. **Record Production**: Create production runs to manufacture products
5. **Make Sales**: Create sales transactions (inventory is automatically deducted)
6. **Track Payments**: Use the customer ledger to record partial payments

### Excel Import/Export

- **Templates**: Download templates from each module's page
- **Import**: Use the "Import Excel" button to bulk import data
- **Export**: Use the "Export Excel" button to download current data

### Customer Ledger

For customers who pay in installments:
1. Create a sale linked to the customer
2. Go to the customer's ledger page
3. Record payments as they come in
4. The system automatically tracks the balance

## Project Structure

```
skincare-erp/
├── app/
│   ├── (dashboard)/          # Dashboard layout pages
│   │   ├── dashboard/        # Main dashboard
│   │   ├── raw-materials/     # Raw materials module
│   │   ├── formulations/     # Formulations module
│   │   ├── finished-products/ # Finished products module
│   │   ├── production/        # Production module
│   │   ├── customers/         # Customers module
│   │   ├── sales/             # Sales module
│   │   └── reports/          # Reports module
│   ├── api/                   # API routes
│   └── page.tsx               # Root page (redirects to dashboard)
├── lib/
│   ├── supabase/              # Supabase client configuration
│   └── excel/                 # Excel utilities
├── types/                     # TypeScript type definitions
├── supabase/
│   └── schema.sql             # Database schema
└── README.md
```

## Technology Stack

- **Framework**: Next.js 16.1 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Excel**: xlsx library (SheetJS)
- **Validation**: Zod
- **Date Handling**: date-fns

## Notes

- The system is designed for single-user operation
- All tables have Row Level Security (RLS) enabled with permissive policies
- Inventory is automatically updated when production runs or sales are created
- Customer ledger tracks payments and calculates balances automatically

## Support

For issues or questions, please refer to the codebase or Supabase documentation.
