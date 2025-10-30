# OneOhm EPC Backend

NestJS API server for the OneOhm EPC project.

## 🚀 Quick Start

### Installation

```bash
# From root directory
npm install

# Or from this directory
cd apps/backend
npm install
```

### Development

```bash
# From root directory
npm run backend:dev

# Or from this directory
npm run start:dev
```

The API will be available at `http://localhost:8085`

## 🔧 Available Scripts

### Development

```bash
npm run start        # Start application
npm run start:dev    # Start in watch mode
npm run start:debug  # Start in debug mode
```

### Production

```bash
npm run build        # Build for production
npm run start:prod   # Run production build
```

### Code Quality

```bash
npm run lint         # Lint and fix code
npm run lint:check   # Lint without fixing
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

### Testing

```bash
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:cov     # Run tests with coverage
npm run test:e2e     # Run end-to-end tests
```

## 📁 Project Structure

```
apps/backend/
├── src/
│   ├── app.controller.ts
│   ├── app.controller.spec.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── Dockerfile
├── docker-compose.yml
├── nest-cli.json
├── tsconfig.json
└── package.json
```

## 🐳 Docker

### Build and Run

```bash
# Build image
docker build -t oneohm-epc-backend .

# Run container
docker run -p 8085:8085 oneohm-epc-backend

# Or use docker-compose
docker-compose up -d
```

## 🔄 API Endpoints

### Health Check

```
GET /
```

Returns: `Hello World!`

## 🧪 Testing

This project includes both unit tests and e2e tests:

- Unit tests are located next to source files with `.spec.ts` extension
- E2E tests are in the `test/` directory

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## 🌍 Environment Variables

Create a `.env` file in this directory:

```env
# Application
NODE_ENV=development
PORT=8085

# Add your environment variables here
```

## 📦 Dependencies

### Production

- `@nestjs/common` - NestJS common utilities
- `@nestjs/core` - NestJS core framework
- `@nestjs/platform-express` - Express platform adapter
- `reflect-metadata` - Decorator metadata reflection
- `rxjs` - Reactive extensions

### Development

- `@nestjs/cli` - NestJS CLI tools
- `@nestjs/testing` - Testing utilities
- TypeScript
- Jest
- ESLint
- Prettier

## 🔗 Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [NestJS Discord](https://discord.gg/G7Qnnhy)
- [Main Project README](../../README.md)

## 📄 License

UNLICENSED
