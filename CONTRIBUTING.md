# Contributing to PermaCraft

Thank you for your interest in contributing to PermaCraft! This document provides guidelines and instructions for contributing.

## 🌱 Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/your-username/permacraft.git
cd permacraft
```

### 2. Set Up Development Environment

Follow the [README Quick Start](README.md#-quick-start) to set up your local environment.

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-you-are-fixing
```

## 📝 Contribution Guidelines

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(map): Add USGS topographic layer support
fix(auth): Resolve session timeout issue
docs(readme): Update installation instructions
refactor(ai): Improve prompt engineering for terrain analysis
```

### Code Style

- **TypeScript**: Use strict mode, define types explicitly
- **React**: Prefer Server Components by default, add `'use client'` only when needed
- **Formatting**: Follow existing Prettier/ESLint configuration
- **Comments**: Write clear comments for complex logic
- **Naming**: Use descriptive variable and function names

### Testing Your Changes

Before submitting:

```bash
# Build the project
npm run build

# Run linter
npm run lint

# Test locally
npm run dev
```

## 🎯 What to Contribute

### High-Priority Areas

1. **Mobile Responsiveness**
   - Improve touch interactions on map
   - Optimize chat panel for mobile
   - Responsive grid system

2. **Species Database**
   - Add regional native species
   - Include more permaculture guilds
   - Add companion planting data

3. **Map Features**
   - Additional tile sources (Stamen, custom)
   - Drawing tool improvements (snap to grid, etc.)
   - Measurement tools (area, distance)

4. **AI Enhancements**
   - Improved terrain analysis prompts
   - Species recommendation algorithms
   - Multi-language support

5. **Documentation**
   - Tutorial videos or guides
   - API documentation
   - Translation to other languages

### Good First Issues

Look for issues labeled [`good first issue`](https://github.com/yourusername/permacraft/labels/good%20first%20issue) - these are beginner-friendly tasks.

## 🔍 Pull Request Process

### 1. Make Your Changes

- Write clear, concise code
- Add comments where necessary
- Update documentation if needed

### 2. Test Thoroughly

- Test your changes locally
- Ensure builds succeed: `npm run build`
- Check for TypeScript errors

### 3. Update Documentation

- Update README.md if you're adding features
- Update ARCHITECTURE.md for significant technical changes
- Add comments to complex code

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat(scope): Brief description of changes"
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

- Go to your fork on GitHub
- Click "New Pull Request"
- Fill out the PR template
- Link related issues

### 7. PR Review Process

- Maintainers will review your PR
- Address any requested changes
- Once approved, your PR will be merged!

## 🏗️ Project Structure

```
permacraft/
├── app/                    # Next.js app directory (routes)
├── components/             # React components
│   ├── ui/                # shadcn/ui base components
│   ├── map/               # Map-specific components
│   ├── ai/                # AI chat components
│   └── shared/            # Shared UI components
├── lib/                    # Utility libraries
│   ├── db/                # Database schema and client
│   ├── auth/              # Authentication logic
│   ├── ai/                # AI prompts and OpenRouter client
│   ├── map/               # Map utilities (grid, measurements)
│   └── storage/           # R2 storage client
├── data/                   # Seed data (species, etc.)
├── hooks/                  # Custom React hooks
└── scripts/                # Setup scripts
```

## 🐛 Reporting Bugs

### Before Reporting

1. Check [existing issues](https://github.com/yourusername/permacraft/issues)
2. Try the latest version
3. Gather debug information

### Bug Report Template

```markdown
**Describe the bug**
A clear description of the issue.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., macOS, Windows, Linux]
- Browser: [e.g., Chrome 120, Firefox 121]
- Node version: [e.g., 18.17.0]

**Additional context**
Any other relevant information.
```

## 💡 Feature Requests

We welcome feature suggestions! Please:

1. Check if the feature is already requested
2. Clearly describe the use case
3. Explain why it aligns with PermaCraft's mission
4. Include mockups or examples if applicable

## 🧪 Adding Tests

We appreciate test contributions:

- Place tests next to the code they test
- Use descriptive test names
- Cover edge cases
- Aim for meaningful coverage

## 📚 Documentation Contributions

Documentation improvements are highly valued:

- Fix typos or unclear explanations
- Add code examples
- Improve setup instructions
- Create tutorials or guides

## ❓ Questions?

- **GitHub Discussions**: For general questions
- **GitHub Issues**: For bug reports and feature requests
- **Discord**: [Join our community](https://discord.gg/permacraft) (if available)

## 🎉 Recognition

Contributors will be:
- Listed in the README acknowledgments
- Mentioned in release notes
- Thanked in commit messages

Thank you for making PermaCraft better! 🌱
