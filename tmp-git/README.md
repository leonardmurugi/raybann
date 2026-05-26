# Rayban Properties 🇰🇪

A professional internal management system for Rayban Properties. This application handles the direct acquisition of land, tracking of plot inventory, management of customer installment plans, and financial reporting.

## Features
- **Role-Based Access Control (RBAC):** Admin, Reception, and Field Operator roles.
- **Land Inventory:** Track plot numbers, sizes, locations, and title deed status.
- **Debt Tracking:** Manage customer balances and installment receipts.
- **Financial Ledger:** Track sales revenue vs expenses (Petty cash & Field costs).
- **Responsive Design:** Optimized for both office desktops and mobile field operators.
- **Full-Stack:** Express backend with PostgreSQL (Neon) integration.

## Tech Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Framer Motion, Recharts.
- **Backend:** Node.js, Express, PostgreSQL, JWT, Bcrypt.
- **Environment:** Vite + esbuild (for production bundling).

## Setup Instructions

### 1. Environment Variables
Rename `.env.example` to `.env` and provide your secrets:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `JWT_SECRET`: A secure string for authentication.

### 2. Installation
```bash
npm install
```

### 3. Development
```bash
npm run dev
```

### 4. Build & Production
```bash
npm run build
npm start
```

## Database Schema
The system automatically initializes tables on first run:
- `users`: Staff credentials and roles.
- `lands`: Plot inventory.
- `customers`: Client CRM data.
- `sales`: Transaction records linking clients to plots.
- `payments`: Ledger for money in/out.
- `expenses`: Internal company costs.
- `inventory`: Goods tracking.

## Usage Guide
1. **Access:** Register an admin account via the API or direct DB insert.
2. **Setup:** Add your land inventory in the "Land Inventory" section.
3. **Sales:** When a plot is sold, link it to a customer to generate a debt profile.
4. **Finance:** Record every installment and expense to maintain a healthy profit margin view.
