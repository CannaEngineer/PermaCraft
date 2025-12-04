# Changelog

All notable changes to PermaCraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Switched license from MIT to GNU General Public License v3 (GPLv3)

## [0.1.0] - 2024-11-30

### 🎉 Initial Release

#### ✨ Features

**Interactive Map System**
- MapLibre GL JS integration with multiple free tile sources
- Support for Satellite (ESRI), Terrain (ESRI), USGS Topographic, OpenTopoMap, and Street (OSM) layers
- Drawing tools: polygons, lines, points, and custom circle tool
- Alphanumeric grid system with 50ft/25m spacing for precise location references
- Compass rose and dynamic legend
- 20+ zone types (water features, structures, plantings, etc.)

**AI-Powered Terrain Analysis**
- Multi-view screenshot capture (satellite + topographic)
- Automatic terrain interpretation (slopes, elevation, drainage, aspect)
- Grid-based location references for precise recommendations
- OpenRouter integration with Llama 3.2 90B Vision model
- Conversation history with screenshot archival
- Permaculture-first design recommendations
- Native species priority

**Core Functionality**
- User authentication with Better Auth
- Farm creation and management
- Zone drawing and labeling
- Growth simulation timeline
- Public gallery for sharing designs
- Multi-user farm collaboration

**Technical Stack**
- Next.js 14 with App Router and Server Components
- TypeScript for type safety
- Turso (libSQL) serverless database
- Cloudflare R2 for screenshot storage (optional)
- Tailwind CSS + shadcn/ui for styling
- Vercel-ready deployment

#### 📚 Documentation
- Comprehensive README with quick start guide
- Architecture documentation
- Contributing guidelines
- Deployment guide (Vercel and alternatives)
- Code of Conduct
- MIT License
- GitHub issue and PR templates

#### 🔧 Developer Experience
- Claude Code integration (CLAUDE.md)
- TypeScript strict mode
- ESLint configuration
- Git commit conventions
- Auto-save functionality
- Development server with hot reload

### Known Limitations
- Mobile responsiveness needs improvement
- Limited to free OpenRouter models (rate limits may apply)
- R2 storage optional (falls back to base64)
- Species database limited to initial seed data
- No real-time collaboration yet

### Credits
Built with inspiration from the permaculture community and powered by:
- Next.js, MapLibre GL JS, Turso, Better Auth, OpenRouter
- ESRI, USGS, OpenTopoMap, OpenFreeMap for free tile services

---

## Release Notes Format

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements

---

[Unreleased]: https://github.com/yourusername/permacraft/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/permacraft/releases/tag/v0.1.0
