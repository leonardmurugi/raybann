# Project Documentation: Rayban Properties

## Architecture Overview
Rayban Properties is a full-stack internal system for tracking land acquisitions and direct sales. Built with a React frontend and an Express/Node.js backend, it uses a PostgreSQL database (compatible with Neon) for persistent storage.

## Module Map

### 1. Backend (Server-Side)
- **`/server.ts`**: The main entry point. Handles Express middleware, JWT authentication logic, and API routing for Lands, Customers, Sales, and Financials.
- **`/src/server/db.ts`**: Database connectivity module. Uses `pg` (PostgreSQL) pool management and contains the schema initialization script (`dbInit`) which creates tables for users, lands, customers, sales, payments, expenses, and inventory.

### 2. Frontend (Client-Side)
- **`/src/App.tsx`**: Main React component. Handles higher-level routing using `react-router-dom` and wraps the app in the `AuthProvider`.
- **`/src/context/AuthContext.tsx`**: State management for user sessions. Handles JWT persistence in `localStorage` and provides login/logout methods.
- **`/src/lib/api.ts`**: Centralized API client. Abstracts fetch calls and automatically attaches JWT tokens to outgoing requests.

### 3. Components (UI)
- **`/src/components/Layout.tsx`**: The master structural component. Provides a responsive sidebar for desktop and a mobile-friendly drawer for handheld devices.
- **`/src/components/Dashboard.tsx`**: High-level analytical overview. Features summary stats and revenue charts using `Recharts`.
- **`/src/components/LandManagement.tsx`**: Logic for managing the property portfolio. Allows adding new plots (Nairobi HQ logic) and searching/filtering existing inventory.
- **`/src/components/CustomerManagement.tsx`**: CRM module for tracking client data, phone numbers, and identifying documentation (ID/Passport).
- **`/src/components/Financials.tsx`**: Financial ledger tracking. Manages the recording of payments, received installments, and office/field expenses.
- **`/src/components/Login.tsx`**: Styled authentication portal with secure login flow.

### 4. Configuration & Assets
- **`/package.json`**: Managed dependencies and build scripts tailored for a full-stack environment.
- **`/vite.config.ts`**: Vite configuration with Tailwind CSS v4 support and path aliasing.
- **`/.env.example`**: Documentation for required environment variables (DB URL, JWT Secret).
