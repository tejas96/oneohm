# OneOhm EPC Documentation

Complete documentation for the OneOhm EPC NX monorepo.

## 📚 Documentation Index

### Getting Started

- [Main README](../README.md) - Project overview and quick start
- [NX Usage Guide](./NX-USAGE-GUIDE.md) - Complete guide to using NX

### Guides

- [CI/CD with NX](./CI-CD-WITH-NX.md) - GitHub Actions workflow documentation
- [Docker Setup](./DOCKER.md) - Docker and Docker Compose guide

### Application Documentation

- [Backend Documentation](../apps/backend/README.md) - NestJS API documentation
- [Web Documentation](../apps/web/README.md) - Next.js web app documentation
- [Mobile Documentation](../apps/mobile/README.md) - React Native app documentation
- [UX Documentation](../apps/ux/README.md) - Design assets documentation

### Shared Libraries

- [Shared Types](../libs/shared-types/README.md) - TypeScript types and interfaces

## 🚀 Quick Links

### For Developers

- [NX Usage Guide](./NX-USAGE-GUIDE.md#daily-development-workflows) - Daily workflows
- [Working with Shared Libraries](./NX-USAGE-GUIDE.md#working-with-shared-libraries)
- [Troubleshooting](./NX-USAGE-GUIDE.md#troubleshooting)

### For DevOps/CI

- [CI/CD Configuration](./CI-CD-WITH-NX.md) - Complete CI/CD guide
- [Deployment Setup](./CI-CD-WITH-NX.md#deployment-configuration)
- [Secrets Configuration](./CI-CD-WITH-NX.md#secrets-configuration)

### Reference

- [NX Commands Reference](./NX-USAGE-GUIDE.md#nx-commands-reference)
- [Cheat Sheet](./NX-USAGE-GUIDE.md#cheat-sheet)

## 📖 Documentation by Topic

### Architecture

- [Project Structure](./NX-USAGE-GUIDE.md#understanding-the-monorepo)
- [Dependency Graph](./NX-USAGE-GUIDE.md#dependency-graph)
- [Shared Libraries](./NX-USAGE-GUIDE.md#working-with-shared-libraries)

### Development

- [Daily Workflows](./NX-USAGE-GUIDE.md#daily-development-workflows)
- [Building](./NX-USAGE-GUIDE.md#nx-commands-reference)
- [Testing](./NX-USAGE-GUIDE.md#nx-commands-reference)

### Performance

- [Build Caching](./NX-USAGE-GUIDE.md#build-caching)
- [Affected Detection](./NX-USAGE-GUIDE.md#affected-detection)
- [CI/CD Performance](./CI-CD-WITH-NX.md#cicd-performance-comparison)

### Operations

- [CI/CD Workflows](./CI-CD-WITH-NX.md#workflows)
- [Deployment](./CI-CD-WITH-NX.md#deployment-configuration)
- [Monitoring](./CI-CD-WITH-NX.md#monitoring-cicd)

## 🎯 Common Tasks

### Starting Development

```bash
# Install dependencies
npm install

# Start backend
npm run backend:dev

# Start web
npm run web:dev
```

### Testing Changes

```bash
# Test what you changed
npm run affected:test

# Lint what you changed
npm run affected:lint

# Build what you changed
npm run affected:build
```

### Before Committing

```bash
npm run affected:lint
npm run affected:test
npm run format
```

### Visualizing Changes

```bash
# See dependency graph
npm run graph

# See what's affected
npm run affected:graph
```

## 💡 Learn More

- **New to NX?** Start with [NX Usage Guide](./NX-USAGE-GUIDE.md)
- **Setting up CI/CD?** Read [CI/CD with NX](./CI-CD-WITH-NX.md)
- **Having issues?** Check [Troubleshooting](./NX-USAGE-GUIDE.md#troubleshooting)

## 🤝 Contributing

When contributing, please:

1. Read the [NX Usage Guide](./NX-USAGE-GUIDE.md)
2. Follow the [Best Practices](./NX-USAGE-GUIDE.md#best-practices)
3. Test your changes with `npm run affected:test`
4. Update documentation as needed

## 📞 Support

- **Technical Issues**: Check [Troubleshooting](./NX-USAGE-GUIDE.md#troubleshooting)
- **NX Questions**: See [NX Documentation](https://nx.dev)
- **Project Questions**: Check [Main README](../README.md)

---

**All documentation is maintained in this repository. Keep it up to date!**
