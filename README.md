# Fan Playoffs: Hyper-Social Trivia

A playoff-style trivia platform for sports fans, bars, and watch parties. Built with SvelteKit, Express, Socket.IO, and Postgres.

## Project Structure

```
jaysgame/
├── apps/
│   ├── client/         # SvelteKit frontend
│   └── server/         # Express + Socket.IO backend
├── packages/
│   └── shared/         # Shared TypeScript types
├── docs/               # Documentation
│   ├── PRD.md         # Product Requirements Document
│   └── IMPLEMENTATION_PLAN.md
└── docker-compose.yml  # Postgres + Redis
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Database Services

```bash
docker-compose up -d
```

### 3. Set Up Database

```bash
# Generate Prisma Client
npm run db:generate -w apps/server

# Run migrations
npm run db:migrate -w apps/server

# Seed database (optional)
npm run db:seed -w apps/server
```

### 4. Start Development Servers

```bash
# Start both client and server
npm run dev

# Or start individually
npm run dev:client
npm run dev:server
```

The client will be available at http://localhost:5173
The server will be available at http://localhost:3001

## Available Scripts

### Root Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build both client and server
- `npm run lint` - Lint all workspaces
- `npm run format` - Format code with Prettier

### Client Scripts (use `-w apps/client`)

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Type check with svelte-check

### Server Scripts (use `-w apps/server`)

- `npm run dev` - Start with tsx watch mode
- `npm run build` - Compile TypeScript
- `npm run start` - Run compiled server
- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Environment Variables

### Server (apps/server/.env)

```
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://jaysgame:jaysgame@localhost:5432/jaysgame
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

### Client (apps/client/.env)

```
PUBLIC_API_URL=http://localhost:3001
PUBLIC_SOCKET_URL=http://localhost:3001
```

## Development Status

**Current Phase:** Epic 1 - Foundation (Ticket 1.1 Complete)

✅ Completed:

- Monorepo structure with npm workspaces
- SvelteKit client with TypeScript + Tailwind
- Express server with TypeScript
- Shared types package
- Docker Compose for Postgres + Redis
- Prisma schema with all models
- Environment configuration

🚧 In Progress:

- Husky + lint-staged setup
- Database migrations
- Seed data

📝 Next Up:

- Authentication system (Ticket 1.3)
- Socket.IO infrastructure (Ticket 1.4)
- Match management (Epic 2)

## Tech Stack

**Frontend:**

- SvelteKit
- TypeScript
- Tailwind CSS
- Socket.IO Client
- Leaflet (maps)

**Backend:**

- Node.js + Express
- TypeScript
- Socket.IO
- Prisma ORM
- Postgres
- Redis

**Infrastructure:**

- Docker + Docker Compose
- npm workspaces

## Documentation

- [Product Requirements Document](./docs/PRD.md)
- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)

## License

Private - All Rights Reserved
