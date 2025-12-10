# PermaCraft AI-Powered Permaculture Design Platform

## Application Overview

PermaCraft is an advanced AI-powered permaculture design platform that combines interactive mapping with intelligent terrain analysis for regenerative agriculture planning. The application enables farmers, permaculturists, and land stewards to design sustainable farms using cutting-edge AI vision models to analyze satellite and topographic imagery for location-specific recommendations.

## Problems Solved

### Traditional Farm Planning Challenges
- **Terrain Analysis Complexity**: Manual interpretation of topographic maps and satellite imagery requires specialized skills
- **Species Selection Overwhelm**: Difficulty choosing appropriate native species for local climate conditions
- **Location-Specific Design**: Challenges matching plant species to microclimates, drainage patterns, and slopes
- **Design Visualization**: Difficulty visualizing how different zones will interact on actual terrain
- **Knowledge Gap**: Lack of access to permaculture expertise for sustainable design decisions

### PermaCraft Solutions
- **AI-Powered Terrain Analysis**: Automatically identifies drainage patterns, slopes, aspect, and elevation changes
- **Native Species Recommendations**: Matches plants to local climate zones and soil conditions
- **Grid-Based Location System**: Provides precise coordinates for implementation
- **Multi-View Analysis**: Correlates satellite imagery with topographic data for comprehensive planning
- **Expert System Integration**: Makes permaculture expertise accessible to everyone

## Core Features

### 1. Interactive Map Design System
- **Multi-Layer Mapping**: Supports satellite, terrain, topographic, and street map layers
- **Drawing Tools**: Create polygons, lines, points, and circles to designate farm zones
- **Color-Coded Zones**: Visual distinction between different farm areas (garden, pond, forest, etc.)
- **Farm Boundary Creation**: Define property boundaries with protection against accidental edits
- **Grid Overlay System**: Alphanumeric grid (A1, B2, C3) with 50ft spacing for precise location references

### 2. AI Vision Analysis Engine
- **Dual-Screenshot Capture**: Automatically captures both satellite and topographic views for comprehensive analysis
- **Terrain Interpretation**: AI reads contour lines, slope gradients, aspect, and drainage patterns
- **Location-Specific Recommendations**: Uses grid coordinates to provide precise location guidance
- **Multi-Model Fallback**: Supports multiple free vision models (Llama 3.2 90B, Gemini Flash, etc.) with automatic fallback
- **Context-Aware Responses**: Considers farm size, climate zone, soil type, and rainfall in recommendations

### 3. Permaculture Species Database
- **Comprehensive Plant Catalog**: Database of native and permaculture-appropriate species
- **Filtering System**: Search by layer (canopy, understory, groundcover, etc.), climate zone, and function
- **Native Species Priority**: Algorithm identifies locally native plants for each farm location
- **Species Details**: Information on mature size, growing requirements, and permaculture functions
- **Guild Suggestions**: Recommendations for plant companions and polyculture systems

### 4. Planting Management System
- **Point-Based Plantings**: Place individual plants on the map with precision
- **Species Selection**: Browse and select from the native species database
- **Planting Records**: Track planted year, growth stage, notes, and zone association
- **Growth Simulation**: Time machine feature to visualize farm at different growth stages
- **Guild Creation**: Group complementary plants in functional polyculture systems

### 5. Farm Management Dashboard
- **Farm Creation**: Create multiple farm profiles with detailed information
- **Climate Data Integration**: Automatic climate zone lookup and rainfall data
- **Size Tracking**: Calculate and monitor farm acreage
- **Soil Type Documentation**: Record and reference soil characteristics
- **Settings Controls**: Manage farm visibility and sharing permissions

### 6. Collaborative Features
- **Public Galleries**: Share successful designs with the permaculture community
- **Farm Sharing**: Allow others to view or collaborate on specific farms
- **Social Feed**: Discuss farm progress, share insights, and get feedback
- **Community Knowledge**: Contribute regional growing knowledge and practices

### 7. AI Conversation System
- **Persistent Conversations**: Threaded discussions about specific farm areas
- **Historical Context**: AI remembers previous recommendations and design decisions
- **Screenshot Integration**: Reference specific map areas in conversations
- **Multi-Turn Dialogues**: Follow-up questions building on previous analysis
- **Conversation Management**: Organize and reference past discussions

### 8. Advanced Mapping Tools
- **Compass Rose Display**: Always know north orientation on the map
- **Measurement Grid**: Imperial and metric options with adjustable density
- **Map Controls**: Layer selection, navigation, and view customization
- **Zoom Controls**: Detailed close-ups and overview perspectives
- **Terrain 3D View**: Enhanced visualization of topography

### 9. Data Export and Sharing
- **Screenshot Capture**: Export map views with AI analysis for reports
- **Zone Documentation**: Export detailed zone information and recommendations
- **Species Lists**: Generate shopping lists of recommended plants
- **Design Plans**: Create implementation-ready plans with coordinates

### 10. Feed and Community Features
- **Farm Posts**: Share progress, insights, and challenges
- **Media Integration**: Include photos and screenshots with posts
- **AI Analysis Sharing**: Publish AI recommendations as feed posts
- **Community Engagement**: Like, comment, and react to others' farm posts
- **Knowledge Repository**: Build collective wisdom through shared experiences

## Technical Architecture

### Frontend
- **Framework**: Next.js 14 with App Router
- **Type Safety**: TypeScript throughout the application
- **Mapping**: MapLibre GL JS with Mapbox Draw for interactive editing
- **UI Components**: Tailwind CSS with shadcn/ui for consistent design
- **Client State**: React hooks and context for interactive features

### Backend
- **Database**: Turso (libSQL) - serverless SQLite with global distribution
- **Authentication**: Better Auth for secure user sessions
- **AI Integration**: OpenRouter API with multiple vision models
- **File Storage**: Cloudflare R2 for screenshot storage with base64 fallback
- **API Design**: RESTful Next.js API routes with Zod validation

### AI and Machine Learning
- **Vision Models**: Multi-model fallback system using Llama 3.2 90B Vision, Gemini Flash, and others
- **Prompt Engineering**: Sophisticated prompts for terrain interpretation and permaculture recommendations
- **Context Management**: Conversation history and context window optimization
- **Terrain Analysis**: Automatic interpretation of satellite imagery and topographic maps

## User Experience

### For Beginners
- **Guided Setup**: Intuitive farm creation with helpful tooltips
- **Simple AI Queries**: Natural language interaction with the AI assistant
- **Visual Learning**: Map-based interface makes complex concepts accessible
- **Template Suggestions**: Guided starting points for common permaculture designs

### For Experts
- **Advanced Tools**: Detailed analysis and precise placement capabilities
- **Customization**: Full control over species selection and placement
- **Technical Data**: Access to detailed climate, soil, and terrain information
- **Professional Features**: Export capabilities and implementation planning

## Impact and Value Proposition

PermaCraft democratizes permaculture expertise by making advanced terrain analysis and species selection available to anyone with a computer and internet connection. The platform helps create more sustainable, productive, and resilient agricultural systems by combining traditional permaculture wisdom with modern AI technology, resulting in designs that work harmoniously with natural systems rather than against them.

The application bridges the gap between permaculture theory and practical implementation by providing concrete, location-specific guidance that takes into account the unique characteristics of each piece of land.