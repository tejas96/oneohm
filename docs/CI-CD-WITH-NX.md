# GitHub Actions CI/CD with NX - OneOhm EPC

Complete guide to the CI/CD setup using NX for the OneOhm EPC project.

## 📋 Overview

The project uses a **unified CI/CD workflow** powered by NX that intelligently runs only affected projects, providing:

- ⚡ **50-70% faster CI/CD** times
- 🎯 **Smart affected detection**
- 🔄 **Parallel execution** across projects
- 💰 **Reduced CI/CD costs**
- 🚀 **Faster feedback loops**

---

## 🔄 Workflows

### 1. Main CI/CD Workflow (`ci-cd.yml`)

**Location**: `.github/workflows/ci-cd.yml`

**Triggers:**

- Push to `main` or `dev` branches
- Pull requests to `main` or `dev` branches

**Jobs:**

#### Job 1: Setup

- Checks out code with full git history
- Installs dependencies
- Prepares environment for affected detection

#### Job 2: Lint Affected

- Runs ESLint on all affected projects in parallel
- Uses `nx affected --target=lint --parallel=3`

#### Job 3: Test Affected

- Runs tests on all affected projects in parallel
- Generates coverage reports
- Uploads to Codecov
- Uses `nx affected --target=test --parallel=3`

#### Job 4: Build Affected

- Builds all affected projects in parallel
- Uploads build artifacts
- Uses `nx affected --target=build --parallel=3`

#### Job 5: Deploy Backend (main only)

- Checks if backend is affected
- Downloads pruned `apps/backend/dist` artifact
- Deploys to **Fly.io** (`flyctl deploy apps/backend`)

#### Job 6: Deploy Web (main only)

- Checks if web is affected
- Downloads `apps/web/.next` artifact
- Deploys to **Fly.io** via thin `Dockerfile.runtime`

#### PR: Docker Verify

- `docker-verify-backend` — prune + `docker build` + `/app` filesystem size check (500MB limit; Docker layer total is logged for reference only)
- `docker-verify-web` — full multi-stage build smoke test

---

### 2. Publish Shared (`publish-shared.yml`)

**Location**: `.github/workflows/publish-shared.yml`

**Purpose**: Build and publish `@tejas96/shared` to GitHub Packages on `libs/shared` changes.

### 3. UX Deployment (inactive)

**Location**: `.github/workflows/ux-deploy.yml.comment.out` (disabled)

**Jobs:**

- Creates/updates `index.html` if not exists
- Uploads `apps/ux` to GitHub Pages
- Deploys to GitHub Pages

---

### 3. CodeQL Security Workflow (`codeql.yml`)

**Location**: `.github/workflows/codeql.yml`

**Purpose**: Security scanning and vulnerability detection

**Triggers:**

- Push to main branches
- Pull requests
- Weekly schedule

---

## 🎯 How Affected Detection Works

### The Magic: `nrwl/nx-set-shas@v4`

This GitHub Action automatically determines what has changed:

```yaml
- name: Derive appropriate SHAs for base and head
  uses: nrwl/nx-set-shas@v4

- name: Run tests on affected
  run: npx nx affected --target=test --parallel=3
```

**How it works:**

1. **On PR**: Compares PR branch with target branch (e.g., `main`)
2. **On Push**: Compares current commit with previous commit
3. **First commit**: Runs on all projects

### Example Scenarios

#### Scenario 1: Change Only Backend Code

```yaml
Files changed:
- apps/backend/src/app.service.ts

NX detects:
- backend (affected)

CI runs:
✓ Lint backend (30s)
✓ Test backend (1m)
✓ Build backend (1m)
✓ Deploy backend (2m)

Total: ~4.5 minutes
```

#### Scenario 2: Change Shared Package

```yaml
Files changed:
- libs/shared/src/types/enums/index.ts

NX detects:
- shared (affected)
- backend (depends on shared)
- web (depends on shared)

CI runs:
✓ Lint shared, backend, web (1m)
✓ Test shared, backend, web (2m)
✓ Build shared, backend, web (5m)
✓ Deploy backend + web (4m)

Total: ~12 minutes
```

#### Scenario 3: Change Only Documentation

```yaml
Files changed:
- README.md
- docs/CONTRIBUTING.md

NX detects:
- No projects affected

CI runs:
✓ Setup only (30s)
✓ No lint/test/build needed

Total: ~30 seconds
```

#### Scenario 4: Change Only UX Designs

```yaml
Files changed:
- apps/ux/mockups/dashboard.png

NX detects:
- ux (affected)

CI runs:
✓ Deploy UX to GitHub Pages (45s)

Total: ~45 seconds
```

---

## 📊 CI/CD Performance Comparison

### Before NX (Individual Workflows)

```
Every PR runs:
├─ Backend workflow (5 min)
├─ Web workflow (3 min)
├─ Mobile workflow (2 min)
└─ Total: 10 minutes

Cost per month (100 PRs):
100 PRs × 10 min = 1,000 minutes
```

### After NX (Unified with Affected)

```
Backend-only PR:
├─ Affected detection (30s)
├─ Backend CI (2.5 min)
└─ Total: 3 minutes (70% faster!)

Web-only PR:
├─ Affected detection (30s)
├─ Web CI (2 min)
└─ Total: 2.5 minutes (75% faster!)

Documentation PR:
├─ Affected detection (30s)
└─ Total: 30 seconds (95% faster!)

Average cost per month (100 PRs):
Mixed PRs × avg 4 min = 400 minutes
60% cost reduction! 💰
```

---

## 🔧 Workflow Configuration

### Current CI/CD Workflow

```yaml
name: CI/CD with NX

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history for affected detection

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

  lint:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - uses: nrwl/nx-set-shas@v4

      - name: Lint affected projects
        run: npx nx affected --target=lint --parallel=3

  test:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - uses: nrwl/nx-set-shas@v4

      - name: Test affected projects
        run: npx nx affected --target=test --parallel=3 --coverage

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - uses: nrwl/nx-set-shas@v4

      - name: Build affected projects
        run: npx nx affected --target=build --parallel=3
```

### Key Configuration Points

#### 1. Full Git History (`fetch-depth: 0`)

**Critical** for affected detection:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0 # Don't change this!
```

Without full history, NX cannot determine what changed.

#### 2. Concurrency

Prevents multiple CI runs for the same ref:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Benefit**: If you push multiple commits quickly, only the latest runs.

#### 3. Parallel Execution

```yaml
run: npx nx affected --target=build --parallel=3
```

**Explanation:**

- `--parallel=3`: Runs up to 3 builds simultaneously
- Adjust based on GitHub Actions runner specs
- Free tier: Use 2-3 parallel workers
- Paid tier: Use 4-6 parallel workers

#### 4. Dependency Graph

Jobs run in order based on dependencies:

```yaml
jobs:
  setup: # Runs first

  lint: # Runs after setup
    needs: setup

  test: # Runs after setup (parallel with lint)
    needs: setup

  build: # Runs after lint AND test
    needs: [lint, test]

  deploy: # Runs after build
    needs: build
```

---

## 🚀 Deployment Configuration

### Backend Deployment

```yaml
deploy-backend:
  needs: build
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - uses: actions/setup-node@v4
      with:
        node-version: '20'

    - run: npm ci

    - uses: nrwl/nx-set-shas@v4

    - name: Check if backend is affected
      id: check-backend
      run: |
        if npx nx print-affected --select=projects | grep -q "backend"; then
          echo "affected=true" >> $GITHUB_OUTPUT
        else
          echo "affected=false" >> $GITHUB_OUTPUT
        fi

    - name: Build Docker Image
      if: steps.check-backend.outputs.affected == 'true'
      working-directory: ./apps/backend
      run: docker build -t oneohm-epc-backend:latest .

    - name: Deploy Backend
      if: steps.check-backend.outputs.affected == 'true'
      run: |
        # Add your deployment commands here
        # Examples:
        # - Push to Docker registry
        # - Deploy to Kubernetes
        # - Deploy to AWS ECS
        # - Deploy to Heroku
        echo "Deploy backend to production"
```

**Key Points:**

- Only runs on `main` branch pushes
- Checks if backend is affected before deploying
- Skips deployment if backend unchanged

### Web Deployment (Vercel Example)

```yaml
deploy-web:
  needs: build
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - uses: actions/setup-node@v4
      with:
        node-version: '20'

    - run: npm ci

    - uses: nrwl/nx-set-shas@v4

    - name: Check if web is affected
      id: check-web
      run: |
        if npx nx print-affected --select=projects | grep -q "web"; then
          echo "affected=true" >> $GITHUB_OUTPUT
        else
          echo "affected=false" >> $GITHUB_OUTPUT
        fi

    - name: Deploy to Vercel
      if: steps.check-web.outputs.affected == 'true'
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        working-directory: ./apps/web
```

---

## 🔐 Secrets Configuration

### Required Secrets

Add these to your GitHub repository secrets (Settings → Secrets and variables → Actions):

#### For Backend Deployment:

```
DOCKER_USERNAME          # Docker Hub username
DOCKER_PASSWORD          # Docker Hub password (or token)
AWS_ACCESS_KEY_ID        # If deploying to AWS
AWS_SECRET_ACCESS_KEY    # If deploying to AWS
```

#### For Web Deployment (Vercel):

```
VERCEL_TOKEN            # Vercel deployment token
VERCEL_ORG_ID          # Your Vercel org ID
VERCEL_PROJECT_ID      # Your Vercel project ID
```

#### For Code Coverage:

```
CODECOV_TOKEN          # Codecov upload token (optional)
```

---

## 📈 Monitoring CI/CD

### View Affected Projects

In any PR, add a comment or check logs:

```bash
# In GitHub Actions logs, you'll see:
NX   Affected projects:

- backend
- shared

# Or view locally:
git checkout your-branch
npx nx affected:apps
npx nx affected:libs
```

### CI/CD Dashboard

Track performance in GitHub:

- **Actions tab**: View workflow runs
- **Insights → Actions**: View usage statistics
- Check average run times per workflow

---

## 🛠️ Customization

### Adding New Deployment Target

```yaml
  needs: build
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  runs-on: macos-latest # For iOS builds
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - uses: actions/setup-node@v4
      with:
        node-version: '20'

    - run: npm ci

    - uses: nrwl/nx-set-shas@v4

      run: |
          echo "affected=true" >> $GITHUB_OUTPUT
        else
          echo "affected=false" >> $GITHUB_OUTPUT
        fi

    - name: Build iOS App
      run: |
        pod install
        xcodebuild -workspace *.xcworkspace -scheme * build
```

### Adding Environment-Specific Builds

```yaml
- name: Build for Staging
  if: github.ref == 'refs/heads/develop'
  run: npx nx affected --target=build --configuration=staging

- name: Build for Production
  if: github.ref == 'refs/heads/main'
  run: npx nx affected --target=build --configuration=production
```

### Matrix Builds (Multiple Node Versions)

```yaml
test:
  needs: setup
  runs-on: ubuntu-latest
  strategy:
    matrix:
      node-version: [18, 20, 22]
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}

    - run: npm ci
    - uses: nrwl/nx-set-shas@v4
    - run: npx nx affected --target=test --parallel=3
```

---

## 🐛 Troubleshooting

### Issue 1: Affected Detection Not Working

**Symptom**: All projects run even when only one changed

**Solution**:

```yaml
# Ensure full git history
- uses: actions/checkout@v4
  with:
    fetch-depth: 0 # ← Must be 0!
```

### Issue 2: NX Daemon Issues

**Symptom**: Random failures, hanging builds

**Solution**:

```yaml
# Disable daemon in CI
- name: Run tests
  run: NX_DAEMON=false npx nx affected --target=test
```

### Issue 3: Cache Not Working

**Symptom**: Builds always take full time

**Solution**:

```yaml
# Ensure npm cache is configured
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm' # ← Enable npm cache
```

### Issue 4: Out of Memory

**Symptom**: JavaScript heap out of memory

**Solution**:

```yaml
- name: Build with more memory
  run: NODE_OPTIONS="--max-old-space-size=4096" npx nx affected --target=build
```

---

## 📚 Best Practices

### 1. Branch Protection Rules

Configure in GitHub Settings → Branches:

```yaml
Protected branches: main, develop

Require status checks before merging:
✓ lint
✓ test
✓ build

Require branches to be up to date: ✓
```

### 2. PR Labels

Use labels to control deployments:

```yaml
deploy-backend:
  if: |
    github.event_name == 'push' && 
    github.ref == 'refs/heads/main' &&
    !contains(github.event.head_commit.message, '[skip-deploy]')
```

### 3. Notifications

Add Slack/Discord notifications:

```yaml
- name: Notify on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "CI failed for ${{ github.repository }}"
      }
```

### 4. Artifact Retention

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: dist
    path: apps/*/dist
    retention-days: 7 # Keep for 7 days
```

---

## 📊 Performance Metrics

Track these metrics to optimize CI/CD:

1. **Average CI Time**: Target < 5 minutes for typical PRs
2. **Cache Hit Rate**: Target > 70%
3. **Affected Ratio**: Average % of projects affected
4. **Monthly Minutes**: Track GitHub Actions usage
5. **Deployment Frequency**: How often each app deploys

---

## 🎯 Next Steps

1. **Enable NX Cloud** for remote caching (free for open source)
2. **Add deployment scripts** for your infrastructure
3. **Configure secrets** for production deployments
4. **Set up monitoring** for deployed applications
5. **Add performance budgets** to CI checks

---

## 📖 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NX CI Documentation](https://nx.dev/ci/intro/ci-with-nx)
- [NX Cloud](https://nx.app)
- [Main README](../README.md)
- [NX Usage Guide](./NX-USAGE-GUIDE.md)

---

**Your CI/CD is now optimized with NX! 🚀**
