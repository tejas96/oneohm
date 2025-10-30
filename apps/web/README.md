# OneOhm EPC Web Application

Next.js web application for the OneOhm EPC project.

## 🚀 Quick Start

### Installation

```bash
# From root directory
npm install

# Or from this directory
cd apps/web
npm install
```

### Development

```bash
# From root directory
npm run web:dev

# Or from this directory
npm run dev
```

Open [http://localhost:8085](http://localhost:8085) in your browser.

## 🔧 Available Scripts

### Development

```bash
npm run dev    # Start development server with hot reload
```

### Production

```bash
npm run build  # Build for production
npm run start  # Start production server
```

### Code Quality

```bash
npm run lint          # Lint code
npm run lint:fix      # Lint and fix code
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting
```

## 📁 Project Structure

```
apps/web/
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── public/             # Static assets
├── next.config.ts      # Next.js configuration
├── tailwind.config.ts  # Tailwind configuration
├── tsconfig.json       # TypeScript configuration
└── package.json
```

## 🎨 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: React 19
- **Code Quality**: ESLint + Prettier

## 🌍 Environment Variables

Create a `.env.local` file in this directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8085

# Add your environment variables here
# Note: Variables must start with NEXT_PUBLIC_ to be exposed to the browser
```

## 📦 Key Dependencies

### Production

- `next` - Next.js framework
- `react` - React library
- `react-dom` - React DOM renderer
- `tailwindcss` - Utility-first CSS framework

### Development

- `typescript` - TypeScript language
- `eslint` - Linting
- `eslint-config-next` - Next.js ESLint configuration
- `prettier` - Code formatter

## 🚢 Deployment

### Vercel (Recommended)

The easiest way to deploy is using [Vercel](https://vercel.com):

```bash
npm install -g vercel
vercel
```

### Other Platforms

- **Netlify**: Supports Next.js out of the box
- **AWS**: Use AWS Amplify or custom deployment
- **Docker**: Build and deploy Docker container

## 🔗 API Integration

Configure the backend API URL in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8085
```

Example API call:

```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/endpoint`);
const data = await response.json();
```

## 🎯 Features

- ✅ Server-side rendering (SSR)
- ✅ Static site generation (SSG)
- ✅ API routes
- ✅ TypeScript support
- ✅ Tailwind CSS for styling
- ✅ ESLint and Prettier configured
- ✅ Hot module replacement
- ✅ Image optimization

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Main Project README](../../README.md)

## 📄 License

UNLICENSED
