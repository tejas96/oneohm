# OneOhm EPC Web Dashboard

> **Next.js 16 admin dashboard for managing solar EPC business operations.**

## 🎯 Overview

A modern, responsive web application built with Next.js App Router for managing all aspects of the OneOhm EPC platform including customers, quotes, projects, inventory, and analytics.

**Tech Stack:** Next.js 16 | React 19 | Tailwind CSS 4 | TanStack Query | Zustand | Radix UI

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm
- Backend API running (port 8085)

### Installation

```bash
# From root directory
npm install

# Set up environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with API URL
```

### Development

```bash
# From root directory
npm run web:dev

# Or from this directory
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 📁 Project Structure

```
apps/web/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth routes (public)
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/            # Dashboard routes (protected)
│   │   ├── layout.tsx          # Dashboard layout
│   │   └── page.tsx            # Dashboard home
│   │
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── not-found.tsx           # 404 page
│
├── components/
│   ├── features/               # Feature-specific components
│   │   ├── analytics/          # Charts, metrics
│   │   ├── approvals/          # Approval workflows
│   │   ├── customers/          # Customer management
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── documents/          # Document viewer
│   │   ├── employees/          # Employee management
│   │   ├── finance/            # Finance components
│   │   ├── inventory/          # Stock management
│   │   ├── organizations/      # Org settings
│   │   ├── pipeline/           # Sales pipeline
│   │   ├── projects/           # Project tracking
│   │   ├── quotes/             # Quote builder
│   │   ├── resellers/          # Partner management
│   │   ├── service/            # Service requests
│   │   ├── site-visits/        # Site visit scheduling
│   │   ├── users/              # User management
│   │   └── workflows/          # Workflow builder
│   │
│   ├── layout/                 # Layout components
│   │   ├── sidebar.ts          # Sidebar navigation
│   │   ├── header.ts           # Header bar
│   │   └── index.ts
│   │
│   ├── shared/                 # Shared components
│   │   ├── data-table.ts       # Generic data table
│   │   ├── form-field.ts       # Form field wrapper
│   │   ├── loading.ts          # Loading states
│   │   └── index.ts
│   │
│   └── ui/                     # Base UI (shadcn/ui)
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       └── ...
│
├── lib/
│   ├── api/                    # API client
│   │   ├── client.ts           # Axios instance
│   │   └── endpoints.ts        # API endpoints
│   │
│   ├── config/                 # Configuration
│   │   ├── navigation.ts       # Nav menu config
│   │   ├── routes.ts           # Route definitions
│   │   └── query-client.tsx    # React Query setup
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-auth.ts         # Auth hook
│   │   └── use-toast.ts        # Toast notifications
│   │
│   ├── stores/                 # Zustand stores
│   │   ├── auth-store.ts       # Auth state
│   │   └── ui-store.ts         # UI state
│   │
│   ├── types/                  # TypeScript types
│   │   └── index.ts
│   │
│   └── utils/                  # Utility functions
│       └── index.ts
│
├── providers/                  # React providers
│   ├── index.tsx               # Provider composition
│   └── query-provider.tsx      # React Query provider
│
├── public/                     # Static assets
│   └── *.svg                   # Icons and images
│
├── components.json             # shadcn/ui config
├── next.config.ts              # Next.js config
├── postcss.config.mjs          # PostCSS config
├── tailwind.config.ts          # Tailwind config
├── tsconfig.json               # TypeScript config
├── Dockerfile                  # Production Docker
└── package.json
```

---

## 🎨 Feature Modules

| Module            | Description          | Key Components                      |
| ----------------- | -------------------- | ----------------------------------- |
| **Dashboard**     | Overview & KPIs      | Charts, metrics, quick actions      |
| **Customers**     | Customer management  | Customer list, profile, properties  |
| **Quotes**        | Quote management     | Quote builder, calculator, versions |
| **Projects**      | Project tracking     | Timeline, tasks, phases             |
| **Inventory**     | Stock management     | Products, warehouses, movements     |
| **Finance**       | Financial operations | Invoices, payments, reports         |
| **Approvals**     | Approval workflows   | Pending approvals, approval history |
| **Users**         | User management      | User list, roles, permissions       |
| **Organizations** | Org settings         | Company profile, settings           |
| **Analytics**     | Reports & analytics  | Charts, exports, dashboards         |

---

## 🛠 Tech Stack Details

### Core

- **Next.js 16** - React framework with App Router
- **React 19** - UI library with Server Components
- **TypeScript 5.7** - Type safety

### Styling

- **Tailwind CSS 4** - Utility-first CSS
- **tailwindcss-animate** - Animation utilities
- **class-variance-authority** - Component variants
- **clsx** + **tailwind-merge** - Class utilities

### UI Components

- **Radix UI** - Headless UI primitives
  - Avatar, Checkbox, Dialog
  - Dropdown Menu, Popover, Select
  - Tabs, Label, Separator, Slot
- **Lucide React** - Icon library
- **Recharts** - Charts and visualizations
- **cmdk** - Command palette
- **Sonner** - Toast notifications

### Data & State

- **TanStack Query** - Server state management
- **TanStack Table** - Headless table
- **TanStack Form** - Form management
- **Zustand** - Client state management
- **Zod** - Schema validation
- **Axios** - HTTP client

### Theme

- **next-themes** - Dark/light mode

---

## 🔧 Available Scripts

### Development

```bash
npm run dev         # Start dev server (port 3001)
npm run build       # Build for production
npm run start       # Start production server
```

### Code Quality

```bash
npm run lint        # Lint code
npm run lint:fix    # Lint and fix
npm run format      # Format with Prettier
npm run format:check # Check formatting
```

---

## 🌍 Environment Variables

Create `.env.local` in this directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8085/api/v1

# App Configuration
NEXT_PUBLIC_APP_NAME=OneOhm EPC
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Feature Flags (optional)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

---

## 📡 API Integration

### API Client Setup

```typescript
// lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Using TanStack Query

```typescript
// Example: Fetching customers
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/customers');
      return data;
    },
  });
}
```

---

## 🎯 Adding New Features

### 1. Create Feature Component

```bash
# Create new feature directory
mkdir -p components/features/my-feature
touch components/features/my-feature/index.ts
```

### 2. Create Component

```typescript
// components/features/my-feature/my-component.tsx
export function MyComponent() {
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

### 3. Export from Index

```typescript
// components/features/my-feature/index.ts
export * from './my-component';
```

### 4. Create Route (if needed)

```typescript
// app/(dashboard)/my-feature/page.tsx
import { MyComponent } from '@/components/features/my-feature';

export default function MyFeaturePage() {
  return <MyComponent />;
}
```

---

## 🐳 Docker

### Build

```bash
docker build -t oneohm-epc-web .
```

### Run

```bash
docker run -p 3001:3001 \
  -e NEXT_PUBLIC_API_URL=http://api:8085/api/v1 \
  oneohm-epc-web
```

### With Docker Compose

```bash
# From root directory
docker compose up web -d
```

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Docker

Build and deploy the Docker image to your preferred container platform.

### Static Export

```bash
npm run build
# Output in .next folder
```

---

## 🎨 Theming

### Dark/Light Mode

The app supports dark and light themes using `next-themes`:

```typescript
// Using theme
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

### Color Variables

Defined in `globals.css` using CSS custom properties for both light and dark modes.

---

## 📚 Resources

- [Main Project README](../../README.md)
- [Backend Documentation](../backend/README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives)
- [TanStack Query Documentation](https://tanstack.com/query/latest)

---

## 📄 License

UNLICENSED - Private project
