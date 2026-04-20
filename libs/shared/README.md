# @tejas96/shared

Shared types, utilities, schemas, and constants for OneOhm EPC applications (backend, web, mobile).

## Sub-path Imports

```ts
import { ProjectType, QuoteStatus } from '@oneohm-epc/shared/types';
import { formatCurrency, debounce } from '@oneohm-epc/shared/utils';
import { quoteBuilderSchema } from '@oneohm-epc/shared/schemas';
import { LOAN_STATUS_LABELS } from '@oneohm-epc/shared/constants';
```

> In the monorepo, `@oneohm-epc/shared` resolves locally via tsconfig path aliases.
> The mobile app installs `@tejas96/shared` from GitHub Packages and aliases it via babel/tsconfig.

## Structure

```
src/
├── types/          # Enums, interfaces, type definitions
│   ├── enums/      # All shared enums (project, product, quote, customer, etc.)
│   └── interfaces/ # Shared interfaces (pagination, API responses, etc.)
├── utils/          # Platform-agnostic utility functions
│   ├── formatters.ts     # Currency, date, name formatting
│   ├── phone.ts          # Phone number formatting/normalization
│   ├── validation.ts     # Email, phone, pincode validation
│   ├── pagination.ts     # Pagination helpers
│   ├── pricing.ts        # GST/discount calculations
│   ├── product-options.ts # Product derivation utilities
│   ├── enum-helpers.ts   # Enum mapping utilities
│   ├── debounce.ts       # Debounce/debounceAsync
│   ├── error.ts          # API error extraction
│   └── avatar.ts         # Avatar gradient utilities
├── schemas/        # Zod validation schemas (optional peer dep)
│   ├── auth.schema.ts
│   ├── customer.schema.ts
│   ├── property.schema.ts
│   ├── quote.schema.ts
│   ├── project.schema.ts
│   ├── followup.schema.ts
│   ├── site-visit.schema.ts
│   └── workflow-step.schema.ts
└── constants/      # Shared label maps and config constants
```

## Development

```bash
# Build
npx nx build shared

# Watch mode
cd libs/shared && npx tsup --watch

# Typecheck
npx nx typecheck shared

# Lint
npx nx lint shared
```

## Publishing

The package is auto-published to GitHub Packages via the `publish-shared.yml` workflow when changes to `libs/shared/src/` are pushed to `main`.

To publish manually:

```bash
npx nx build shared
cd libs/shared
GITHUB_PACKAGES_TOKEN=<your-token> npm publish
```

## Developer Setup

The `GITHUB_PACKAGES_TOKEN` is needed **only** for the mobile app repo (to install `@tejas96/shared` from GitHub Packages). The monorepo resolves the shared package locally via npm workspaces — no token required.

### Mobile app setup (cross-platform)

```bash
# 1. Clone the mobile repo and enter it
cd oneohm-epc-mobile

# 2. Copy .env.example and add your GitHub token
cp .env.example .env
# Edit .env → set GITHUB_PACKAGES_TOKEN=ghp_your_token

# 3. Run setup (reads token from .env, then installs)
npm run setup
```

Generate a token with `read:packages` scope at [https://github.com/settings/tokens/new?scopes=read:packages](https://github.com/settings/tokens/new?scopes=read:packages)

The `npm run setup` script automatically loads `GITHUB_PACKAGES_TOKEN` from `.env` and passes it to `npm install`. This works on macOS, Linux, and Windows with no shell-specific configuration needed.

> **Alternative:** If you prefer, you can export the token in your shell profile (`~/.zshrc`, `~/.bashrc`, or Windows environment variables) and use `npm install` directly.

### Where is the token NOT needed?

| Context                  | Token needed? | Why                                                                |
| ------------------------ | ------------- | ------------------------------------------------------------------ |
| Monorepo (`npm install`) | No            | Workspace resolves `libs/shared` locally                           |
| Monorepo CI/CD           | No            | Same reason                                                        |
| Fly.io Docker builds     | No            | Shared package is copied from workspace, not fetched from registry |
| Mobile (`npm install`)   | **Yes**       | Fetches `@tejas96/shared` from GitHub Packages                     |
| Mobile CI                | Auto          | Uses `secrets.GITHUB_TOKEN` (built-in)                             |
