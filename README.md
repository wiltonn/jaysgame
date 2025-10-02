# Fan Playoffs: Hyper-Social Trivia ⚾

A real-time multiplayer trivia platform for sports fans, bars, and watch parties. Built with SvelteKit, Express, Socket.IO, and Postgres.

**Status:** 🚀 **MVP Complete** - Ready for testing and deployment!

## Features

### 🎮 Player Experience

- **QR Code Joining** - Scan to join instantly, no app install required
- **Real-time Gameplay** - Live questions with countdown timers
- **Multiple Question Types** - Multiple choice, true/false, closest number, media questions
- **Emoji Reactions** - Express yourself with animated emoji bursts (💥🧢🦜🔥⚾👏)
- **Live Leaderboard** - See your rank and score in real-time
- **Baseball Scoring** - 9-inning format with line score display
- **Grand Slam Mode** - Final question worth 4 runs!
- **Speed Bonus** - Fastest 5 correct answers get extra runs
- **Mobile-First Design** - Optimized for phones and tablets

### 🎯 Host Experience

- **Easy Setup** - Create matches in seconds with pack selection
- **QR Code Display** - Large join code and QR for easy player onboarding
- **Live Controls** - Start, skip, reveal, and trigger stretch
- **Real-time Dashboard** - See all players, questions, and scores live
- **Player Management** - Monitor connections and participation
- **Game Settings** - Configure timers, Grand Slam, and speed bonus

### 📦 Content Management

- **Question Packs** - Import trivia packs via CSV or JSON
- **Pack Validation** - Automatic validation of question structure
- **Multiple Sports** - Support for any sport/team trivia
- **Difficulty Levels** - Tag packs by difficulty
- **Themed Innings** - Each inning can have its own theme

### 🏗️ Technical Features

- **Real-time Sync** - Socket.IO with Redis for scalability
- **Latency Normalization** - Fair speed bonus calculation
- **Auto-reconnection** - Players can rejoin if disconnected
- **Type Safety** - Full TypeScript across frontend and backend
- **Responsive Design** - Works on all devices and screen sizes

## Project Structure

```
jaysgame/
├── apps/
│   ├── client/                  # SvelteKit frontend
│   │   ├── src/
│   │   │   ├── lib/            # Shared utilities (socket store)
│   │   │   └── routes/         # Page routes
│   │   │       ├── +page.svelte             # Home page
│   │   │       ├── join/                    # Player join
│   │   │       ├── lobby/                   # Pre-game lobby
│   │   │       ├── game/                    # Active gameplay
│   │   │       └── host/
│   │   │           ├── setup/               # Match creation
│   │   │           └── control/             # Live host dashboard
│   │   └── package.json
│   └── server/                  # Express + Socket.IO backend
│       ├── src/
│       │   ├── routes/         # HTTP API routes
│       │   ├── services/       # Business logic
│       │   ├── socket/         # WebSocket handlers
│       │   ├── validation/     # Zod schemas
│       │   └── utils/          # Helper functions
│       ├── prisma/             # Database schema & migrations
│       └── package.json
├── packages/
│   └── shared/                  # Shared TypeScript types
├── docs/
│   ├── PRD.md                  # Product Requirements Document
│   └── IMPLEMENTATION_PLAN.md  # Development roadmap
└── docker-compose.yml          # Postgres + Redis
```

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Docker** and **Docker Compose**
- **PostgreSQL** 15+ (via Docker)
- **Redis** 7+ (via Docker)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd jaysgame
npm install
```

### 2. Start Database Services

```bash
docker-compose up -d
```

This starts:

- PostgreSQL on port 5432
- Redis on port 6379

### 3. Configure Environment

**Server** (`apps/server/.env`):

```env
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://jaysgame:jaysgame@localhost:5432/jaysgame
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

**Client** (`apps/client/.env`):

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

### 4. Set Up Database

```bash
# Generate Prisma Client
npm run db:generate -w apps/server

# Run migrations
npm run db:migrate -w apps/server

# Seed database with sample data
npm run db:seed -w apps/server
```

### 5. Start Development Servers

```bash
# Start both client and server
npm run dev
```

**Access the app:**

- **Client**: http://localhost:5173
- **Server API**: http://localhost:3001
- **Server Health**: http://localhost:3001/health

## Usage Guide

### For Hosts

1. **Navigate to Home** - Visit http://localhost:5173
2. **Click "Host Game"** - Goes to match setup
3. **Select Question Pack** - Choose from available trivia packs
4. **Configure Settings**:
   - Timer duration (10-60 seconds)
   - Grand Slam mode (4-run final question)
   - Speed bonus (fastest 5 get extra run)
5. **Create Match** - System generates join code and QR code
6. **Share Join Code** - Players scan QR or enter code
7. **Start Match** - Once players join, click "Start Match"
8. **Control Game**:
   - Monitor players and scores
   - Skip questions if needed
   - Reveal answers manually
   - Trigger 7th inning stretch

### For Players

1. **Join Game** - Scan QR code or visit join page
2. **Enter Code** - Type 6-character join code (e.g., ABC123)
3. **Choose Nickname** - Pick your display name
4. **Select Avatar** - Choose emoji avatar (optional)
5. **Opt-in to Location** - Share your city (optional)
6. **Wait in Lobby** - See other players joining
7. **Play Game**:
   - Read questions carefully
   - Select your answer
   - Submit before timer expires
   - Send reactions during gameplay
8. **View Results** - See if you were correct and earned runs
9. **Check Leaderboard** - Track your ranking throughout game

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Packs

- `GET /api/packs` - List available question packs
- `GET /api/packs/:id` - Get pack details
- `POST /api/packs/import` - Import new pack (authenticated)

### Matches

- `POST /api/matches` - Create new match (authenticated)
- `GET /api/matches/:id` - Get match details
- `GET /api/matches/join/:code` - Get match by join code
- `GET /api/matches/:id/summary` - Get post-game summary

### Socket.IO Events

**Player Events:**

- `player:join` - Join a match
- `player:leave` - Leave a match
- `answer:submit` - Submit answer to question
- `reaction:send` - Send emoji reaction

**Host Events:**

- `host:start` - Start match
- `host:action` - Control match (pause, skip, reveal, stretch)

**Broadcast Events:**

- `state:update` - Match state changed
- `player:joined` - Player joined match
- `player:left` - Player left match
- `question:show` - New question broadcast
- `question:reveal` - Answer revealed
- `score:update` - Leaderboard updated
- `reaction:broadcast` - Reaction from player
- `heckle:show` - Heckle message display

## Development Scripts

### Root Level

```bash
npm run dev          # Start both client and server
npm run build        # Build both applications
npm run lint         # Lint all workspaces
npm run format       # Format code with Prettier
npm run typecheck    # Type check all workspaces
```

### Client (`-w apps/client`)

```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run check        # Type check with svelte-check
npm run lint         # ESLint
```

### Server (`-w apps/server`)

```bash
npm run dev          # Development with tsx watch
npm run build        # Compile TypeScript
npm run start        # Run compiled server
npm run lint         # ESLint
npm run db:generate  # Generate Prisma Client
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed sample data
```

## Architecture

### Frontend Architecture

- **SvelteKit** - Meta-framework for Svelte with SSR/SSG
- **File-based Routing** - Routes map to file structure
- **Socket Store** - Centralized WebSocket state management
- **Reactive Updates** - Automatic UI updates from state changes
- **Type Safety** - Shared types from `@jaysgame/shared`

### Backend Architecture

- **Express** - HTTP API server
- **Socket.IO** - Real-time WebSocket communication
- **Prisma** - Type-safe database ORM
- **Redis** - Socket.IO adapter for horizontal scaling
- **State Machine** - Manages match lifecycle and transitions

### Data Flow

1. **HTTP API** - RESTful endpoints for setup/configuration
2. **WebSocket** - Real-time events for gameplay
3. **Redis** - Pub/sub for multi-server coordination
4. **PostgreSQL** - Persistent storage for matches/players/answers

## Database Schema

Key models:

- **User** - Host/player accounts
- **Pack** - Question collections
- **Match** - Game instances
- **MatchPlayer** - Player participation
- **MatchAnswer** - Player responses
- **Leaderboard** - Scoring state

See `apps/server/prisma/schema.prisma` for full schema.

## Testing

### Manual Testing Checklist

**Host Flow:**

- [ ] Create match with pack selection
- [ ] Generate join code and QR
- [ ] See players join in real-time
- [ ] Start match successfully
- [ ] Navigate through all 9 innings
- [ ] Skip questions
- [ ] Reveal answers
- [ ] Trigger 7th inning stretch
- [ ] See final scores and MVP

**Player Flow:**

- [ ] Join via QR code
- [ ] Join via manual code entry
- [ ] Select nickname and avatar
- [ ] Wait in lobby
- [ ] Answer multiple choice questions
- [ ] Answer true/false questions
- [ ] Answer closest number questions
- [ ] Send emoji reactions
- [ ] See heckles display
- [ ] View live leaderboard
- [ ] See correct/incorrect results
- [ ] Complete full 9-inning game

### Load Testing

```bash
# Install autocannon
npm install -g autocannon

# Test API endpoint
autocannon -c 100 -d 30 http://localhost:3001/health

# Test WebSocket connections (requires custom script)
node scripts/load-test-sockets.js
```

## Deployment

### Environment Configuration

**Production Environment Variables:**

```env
# Server
NODE_ENV=production
PORT=3001
DATABASE_URL=<production-postgres-url>
REDIS_URL=<production-redis-url>
JWT_SECRET=<strong-random-secret>
CLIENT_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# Client
VITE_API_URL=https://api.yourdomain.com
VITE_SOCKET_URL=https://api.yourdomain.com
```

### Docker Deployment

```bash
# Build images
docker build -t jaysgame-client ./apps/client
docker build -t jaysgame-server ./apps/server

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Recommended Hosting

- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Backend**: Railway, Render, or AWS ECS
- **Database**: Supabase, Neon, or AWS RDS
- **Redis**: Upstash, Redis Cloud, or AWS ElastiCache

## Troubleshooting

### Common Issues

**Port Already in Use:**

```bash
# Find process using port
lsof -i :3001
# Kill process
kill -9 <PID>
```

**Database Connection Failed:**

```bash
# Check Docker containers
docker-compose ps
# Restart services
docker-compose restart postgres
```

**Socket Connection Issues:**

- Check CORS settings in server `.env`
- Verify `VITE_SOCKET_URL` in client `.env`
- Check browser console for WebSocket errors

**Build Errors:**

```bash
# Clean and rebuild
rm -rf node_modules package-lock.json
rm -rf apps/*/node_modules apps/*/package-lock.json
npm install
npm run build
```

## Contributing

This is a private project. For questions or issues, contact the project owner.

## Roadmap

### ✅ Phase 1 - MVP (Complete)

- Real-time 9-inning matches
- Player and host interfaces
- Question types and scoring
- Reactions and social features
- QR code joining

### 🔄 Phase 2 - Series & Brackets (Next)

- Best-of-3/5/7 series
- Tournament brackets with seeding
- Elo-based rankings
- Venue league night mode

### 📋 Phase 3 - Marketplace (Future)

- Creator portal for pack publishing
- Pack discovery and ratings
- Team/league custom skins
- Enhanced analytics dashboard
- Sponsorship hooks

## Tech Stack

**Frontend:**

- SvelteKit 2.x - Meta-framework
- TypeScript 5.x - Type safety
- Tailwind CSS 3.x - Styling
- Socket.IO Client 4.x - Real-time
- Vite 5.x - Build tool

**Backend:**

- Node.js 20.x - Runtime
- Express 4.x - HTTP server
- Socket.IO 4.x - WebSocket server
- Prisma 5.x - ORM
- TypeScript 5.x - Type safety
- Zod 3.x - Validation

**Database:**

- PostgreSQL 15.x - Primary database
- Redis 7.x - Caching & pub/sub

**DevOps:**

- Docker & Docker Compose
- npm workspaces - Monorepo
- Husky - Git hooks
- ESLint & Prettier - Code quality

## Documentation

- [Product Requirements Document](./docs/PRD.md) - Full product spec
- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md) - Development roadmap

## License

Private - All Rights Reserved

---

Built with ❤️ by the Fan Playoffs team

🤖 Developed with assistance from [Claude Code](https://claude.com/claude-code)
