# OneOhm EPC - UX Design Assets

This directory contains all UX design assets, mockups, wireframes, and design documentation for the OneOhm EPC project.

## 🎨 Overview

Design files and documentation are automatically deployed to GitHub Pages for easy access by stakeholders and clients.

**Live Preview**: _URL will be available after first deployment_

## 📁 Directory Structure

```
apps/ux/
├── mockups/          # High-fidelity design mockups
├── wireframes/       # Low-fidelity wireframes
├── prototypes/       # Interactive prototypes
├── design-system/    # Design system documentation
├── assets/           # Design assets (icons, images, etc.)
└── index.html        # Main landing page
```

## 🚀 Adding Design Files

### 1. Static HTML/CSS

Simply add HTML files to this directory. They will be automatically deployed.

```bash
apps/ux/
├── index.html
├── mobile-designs.html
├── web-designs.html
└── design-system.html
```

### 2. Design Tool Embeds

Embed designs from popular tools:

#### Figma

```html
<iframe
  style="border: 1px solid rgba(0, 0, 0, 0.1);"
  width="800"
  height="450"
  src="https://www.figma.com/embed?embed_host=share&url=YOUR_FIGMA_URL"
  allowfullscreen
></iframe>
```

#### Adobe XD

Export and host the web prototype, or use Adobe XD Cloud links.

### 3. Image Files

Add PNG, JPG, SVG files for mockups:

```
apps/ux/
├── mockups/
│   ├── mobile-home.png
│   ├── mobile-dashboard.png
│   ├── web-home.png
│   └── web-dashboard.png
```

Display in HTML:

```html
<img src="mockups/mobile-home.png" alt="Mobile Home Screen" />
```

## 🌐 Deployment

### Automatic Deployment

Any changes pushed to the `main` branch will automatically deploy to GitHub Pages.

```bash
# Make changes to design files
git add apps/ux/
git commit -m "Update mobile app designs"
git push origin main

# GitHub Actions will automatically deploy
```

### Manual Deployment

You can also trigger deployment manually from GitHub Actions.

## 📋 Design Documentation Structure

### Recommended Pages

1. **index.html** - Main landing page with navigation
2. **mobile-designs.html** - Mobile app designs and flows
3. **web-designs.html** - Web application designs
4. **design-system.html** - Colors, typography, components
5. **user-flows.html** - User journey diagrams
6. **prototypes.html** - Links to interactive prototypes

## 🎯 Design Tools Integration

### Recommended Tools

- **Figma**: For UI/UX design and prototyping
- **Adobe XD**: Alternative design tool
- **Miro**: For user flows and mind maps
- **Sketch**: For macOS users
- **InVision**: For prototyping and collaboration

### Sharing Designs

1. **Figma**: Share view-only links or embed frames
2. **Adobe XD**: Share cloud links
3. **Miro**: Share board links
4. **Static Exports**: Export as PNG/JPG and commit to repo

## 📱 Design Specifications

### Mobile App

- **Target Platforms**: iOS, Android
- **Design Resolution**: 375x812 (iPhone X/11/12/13 Pro)
- **Android Design**: 360x640 (Most common Android)

### Web Application

- **Desktop**: 1920x1080 (Full HD)
- **Tablet**: 1024x768 (iPad)
- **Mobile Web**: 375x812 (Responsive)

## 🎨 Design System

Document your design system:

- **Colors**: Primary, secondary, accent colors
- **Typography**: Font families, sizes, weights
- **Spacing**: Margin and padding scale
- **Components**: Buttons, inputs, cards, etc.
- **Icons**: Icon library and usage
- **Illustrations**: Custom illustrations

## 👥 Stakeholder Access

Share the GitHub Pages URL with:

- Product managers
- Developers
- Clients
- Marketing team
- Other stakeholders

They can view designs without needing:

- Design tool accounts
- Repository access
- Technical knowledge

## 🔄 Version Control

All design assets are version-controlled:

```bash
# Create design version branch
git checkout -b design/v1.0

# Make changes
git add apps/ux/
git commit -m "Design v1.0: Initial mobile screens"

# Push and create PR
git push origin design/v1.0
```

## 📚 Resources

### Design Inspiration

- [Dribbble](https://dribbble.com/)
- [Behance](https://www.behance.net/)
- [Awwwards](https://www.awwwards.com/)
- [Mobbin](https://mobbin.com/)

### Design Systems

- [Material Design](https://material.io/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/)
- [Atlassian Design System](https://atlassian.design/)

### Tools

- [Figma](https://www.figma.com/)
- [Adobe XD](https://www.adobe.com/products/xd.html)
- [Sketch](https://www.sketch.com/)
- [Miro](https://miro.com/)

## 🔗 Related Documentation

- [Main Project README](../../README.md)
- [Web App README](../web/README.md)
- [Mobile App README](../mobile/README.md)

## 📄 License

UNLICENSED - Internal design assets
