# Permaculture.Studio 🌱

> AI-powered permaculture design platform combining interactive mapping with intelligent terrain analysis for regenerative agriculture planning.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

---

## ✨ Features

### 🗺️ **Interactive Map-Based Design**
- Draw zones, boundaries, and plantings on satellite, terrain, or topographic maps
- Support for polygons, lines, points, and circles
- Real-time alphanumeric grid system (50ft/25m spacing) for precise location references
- Multiple free map layers: Satellite (ESRI), Terrain (ESRI), USGS Topographic, OpenTopoMap, Street (OpenStreetMap)
- Compass rose and dynamic legend

### 🤖 **AI-Powered Terrain Analysis**
- **Multi-view vision analysis**: Automatically captures both satellite + topographic screenshots
- **Terrain interpretation**: AI understands slopes, elevation, drainage patterns, and aspect
- **Smart recommendations**:
  - Swale placement along contour lines
  - Microclimate zone identification
  - Erosion risk assessment
  - Species selection based on terrain + sun exposure
- Powered by OpenRouter's free vision models (Llama 3.2 90B Vision)
- Conversation history with screenshot archival

### 🌱 **Permaculture-First Design**
- Native species priority with clear [NATIVE] / [NON-NATIVE] labels
- Grid-based location references for precise planting plans
- Growth simulation and timeline visualization
- Zone type system: water features, structures, food forests, annual gardens, etc.

### 🌍 **Collaboration & Sharing**
- Public gallery for design inspiration
- Multi-user farm collaboration
- Export designs and analysis reports

---

## 🏗️ Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 14 (App Router) | React framework with server components |
| **Language** | TypeScript | Type-safe development |
| **Database** | [Turso](https://turso.tech/) (libSQL) | Serverless SQLite database |
| **Authentication** | [Better Auth](https://www.better-auth.com/) | Modern auth for Next.js |
| **Maps** | [MapLibre GL JS](https://maplibre.org/) | Open-source map rendering |
| **Map Tiles** | OpenFreeMap, ESRI, USGS, OpenTopoMap | Free tile sources (no API keys) |
| **AI** | [OpenRouter](https://openrouter.ai/) | Free vision model API |
| **Storage** | [Cloudflare R2](https://www.cloudflare.com/products/r2/) | S3-compatible object storage |
| **Styling** | Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) | Component library |
| **Deployment** | [Vercel](https://vercel.com/) | Serverless hosting |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Turso CLI** - [Installation guide](https://docs.turso.tech/cli/installation)
- **OpenRouter API Key** - [Get free tier](https://openrouter.ai/)
- *Optional*: **Cloudflare R2** bucket for screenshot storage

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/permaculture-studio.git
cd permaculture-studio

# 2. Install dependencies
npm install

# 3. Set up Turso database
turso db create permaculture-studio
turso db shell permaculture-studio < lib/db/schema.sql
turso db shell permaculture-studio < data/seed-species.sql

# 4. Get database credentials
turso db show permaculture-studio
turso db tokens create permaculture-studio

# 5. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 6. Run development server
npm run dev

# 7. Open http://localhost:3000
```

### Environment Variables

See [.env.example](.env.example) for all required variables:

**Required:**
- `TURSO_DATABASE_URL` - Your Turso database URL
- `TURSO_AUTH_TOKEN` - Database authentication token
- `BETTER_AUTH_SECRET` - Generate with `openssl rand -base64 32`
- `BETTER_AUTH_URL` - Your app URL (http://localhost:3000 for dev)
- `OPENROUTER_API_KEY` - Free tier available at openrouter.ai
- `NEXT_PUBLIC_APP_URL` - Same as BETTER_AUTH_URL

**Optional (for screenshot storage):**
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- See [scripts/setup-r2-cors.md](scripts/setup-r2-cors.md) for R2 setup guide
- *Without R2, screenshots fall back to base64 storage (less efficient but functional)*

---

## 📖 Documentation

- **[Architecture Overview](ARCHITECTURE.md)** - System design and technical details
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Deployment Guide](DEPLOYMENT.md)** - Deploy to production (Vercel, etc.)
- **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community guidelines
- **[CLAUDE.md](CLAUDE.md)** - AI assistant development guide

---

## 🎯 How It Works

### 1. Create a Farm
Define your property location, size, climate zone, and soil type.

### 2. Draw Your Design
Use the interactive map to:
- Draw your property boundary
- Mark structures, water features, and existing plantings
- Outline planned zones (food forest, annual garden, orchard, etc.)

### 3. AI Analysis
Ask the AI permaculture assistant questions like:
- "Where should I place swales on this slope?"
- "What native species work well in grid section C4-D6?"
- "Design a food forest for the south-facing area"

The AI automatically:
- Captures both satellite and topographic screenshots
- Analyzes terrain (slopes, drainage, elevation, aspect)
- Provides specific grid-based recommendations
- Suggests species with scientific names and native status

### 4. Refine & Share
- Review AI suggestions and refine your design
- Save conversation history with screenshot context
- Share your design in the public gallery

---

## 🛠️ Development

### Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
turso db shell permaculture-studio                  # Open database shell
turso db shell permaculture-studio < migrations.sql # Run migrations
```

### Project Structure

```
permaculture-studio/
├── app/                    # Next.js app directory
│   ├── (app)/             # Authenticated routes
│   │   ├── dashboard/     # User's farms list
│   │   ├── farm/          # Farm editor
│   │   └── gallery/       # Public gallery
│   ├── (auth)/            # Auth pages (login/register)
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── map/               # Map-related components
│   ├── ai/                # AI chat and suggestions
│   └── shared/            # Shared components
├── lib/
│   ├── db/                # Database client and schema
│   ├── auth/              # Better Auth config
│   ├── ai/                # OpenRouter client and prompts
│   ├── map/               # Map utilities
│   └── storage/           # R2 storage utilities
├── data/                  # Seed data
└── scripts/               # Setup and utility scripts
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Priorities

- [ ] Mobile-responsive design improvements
- [ ] Additional map tile sources (Stamen Terrain, etc.)
- [ ] Species database expansion (more regions)
- [ ] Real-time collaboration features
- [ ] Export to PDF/CAD formats
- [ ] Watershed and water flow calculations
- [ ] Companion planting guilds database

See [GitHub Issues](https://github.com/yourusername/permaculture-studio/issues) for current tasks.

---

## 📜 License

This project is licensed under the GNU General Public License v3 - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Open Source Projects
- [Next.js](https://nextjs.org/) - The React framework
- [MapLibre GL JS](https://maplibre.org/) - Open-source mapping
- [Turso](https://turso.tech/) - Serverless SQLite
- [Better Auth](https://www.better-auth.com/) - Modern authentication
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful components
- [OpenRouter](https://openrouter.ai/) - AI model access

### Free Tile Providers
- [ESRI](https://www.esri.com/) - Satellite and terrain imagery
- [USGS](https://www.usgs.gov/) - Topographic maps
- [OpenTopoMap](https://opentopomap.org/) - OSM-based topo maps
- [OpenFreeMap](https://openfreemap.org/) - Street maps

### Permaculture Community
Built with inspiration from permaculture pioneers and the global regenerative agriculture movement.

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/permaculture-studio/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/permaculture-studio/discussions)
- **Email**: your-email@example.com

---

<p align="center">
  Made with 🌱 for regenerative agriculture and permaculture design
</p>
