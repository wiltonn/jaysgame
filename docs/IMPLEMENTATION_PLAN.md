# Implementation Plan — Fan Playoffs: Hyper-Social Trivia

**Based on:** PRD v1.0
**Status:** Ready for Development
**Target:** MVP (Phase 1) — 4-6 weeks

---

## Phase 1: MVP Implementation Roadmap

### Week 1-2: Foundation & Core Infrastructure

**Milestone 1.1: Project Setup & Infrastructure**

- Initialize monorepo structure (client + server)
- Configure TypeScript, ESLint, Prettier
- Set up Postgres + Redis containers (Docker Compose)
- Initialize Prisma with base schema
- Configure Socket.IO server with room management
- Set up basic CI/CD pipeline

**Milestone 1.2: Authentication & Match Management**

- Implement host authentication (JWT)
- Create match CRUD operations
- Build room management system (Redis)
- Implement QR code generation for join URLs
- Create pack import/validation service

**Acceptance Criteria:**

- ✅ Host can create account and log in
- ✅ Host can create a match with selected pack
- ✅ System generates unique join code + QR
- ✅ Pack validation rejects malformed JSON/CSV
- ✅ Redis rooms properly isolate match state

### Week 2-3: Real-Time Gameplay Engine

**Milestone 2.1: Match State Machine**

- Implement state machine: `lobby → inning → reveal → stretch → postgame`
- Build scoring engine (+1 per correct, +4 grand slam)
- Create answer validation with latency normalization
- Implement inning progression logic
- Build 7th-inning stretch handler

**Milestone 2.2: Socket.IO Event System**

- Player join/leave events with nickname/avatar
- Question broadcast with timer sync
- Answer submission with deduplication
- Real-time leaderboard updates
- Host control events (start/pause/skip)

**Acceptance Criteria:**

- ✅ Players join via URL within 30s on mobile
- ✅ All players receive questions within 200ms of each other
- ✅ Answer locks after first submit
- ✅ Leaderboard updates within 300ms of answer
- ✅ Host can pause/skip innings without state corruption

### Week 3-4: Client Application

**Milestone 3.1: Player Experience**

- Mobile-first responsive layout
- Join flow: nickname + avatar + location opt-in
- Question display with timer bar
- Answer submission UI with immediate feedback
- Reaction burst animations (💥🧢🦜🔥)
- Live leaderboard with inning line score

**Milestone 3.2: Host Console**

- Match lobby with player list
- Live match controls (start/pause/skip)
- Current question display
- Manual heckle injection
- Stretch trigger button
- Match summary export

**Acceptance Criteria:**

- ✅ Player can join and answer on mid-tier mobile <30s
- ✅ Big-Text mode increases font to 28pt+
- ✅ Host can trigger stretch with 30s clip
- ✅ All views sync within 200ms

### Week 4-5: Social & Accessibility Features

**Milestone 4.1: Social Layer**

- Emoji reaction system with throttling
- Heckle mode with contextual one-liners
- YouTube embed integration for clips
- City-level geolocation map (Leaflet)
- Shareable postgame result cards (PNG)

**Milestone 4.2: Accessibility**

- WCAG 2.1 AA compliance
- Read-aloud button (Web Speech API)
- High contrast theme toggle
- Color-blind safe palette
- Keyboard navigation
- Screen reader labels

**Acceptance Criteria:**

- ✅ Reactions broadcast to all players <500ms
- ✅ Map renders with ≥1 city pin when opted in
- ✅ Read-aloud speaks full question text
- ✅ High contrast mode passes WCAG checks
- ✅ Keyboard-only navigation works

### Week 5-6: Polish, Testing & Launch Prep

**Milestone 5.1: Quality Assurance**

- Unit tests: scoring, validation, state machine
- Integration tests: Socket.IO events, reconnection
- E2E tests: full game flow (Playwright)
- Load testing: 100 concurrent players
- Cross-browser testing

**Milestone 5.2: Analytics & Monitoring**

- Event tracking pipeline
- Host dashboard with session stats
- Error logging and alerting
- Performance monitoring

**Acceptance Criteria:**

- ✅ D1 completion rate ≥85% in beta testing
- ✅ No dropped events under 100 concurrent players
- ✅ Cross-device compatibility validated
- ✅ Analytics tracking all key events

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
├──────────────┬──────────────┬───────────────┐
│  Player App  │ Host Console │  Admin Panel  │
│  (Mobile)    │  (Desktop)   │   (Admin)     │
└──────────────┴──────────────┴───────────────┘
                            │
                            │ Socket.IO + HTTP
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    API Gateway Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  HTTP API    │  │ Socket.IO    │  │  Auth Guard  │      │
│  │  (Express)   │  │   Gateway    │  │    (JWT)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   Business Logic Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Match Service │  │ Pack Service │  │Analytics Svc │      │
│  │(State+Score) │  │(CRUD+Valid.) │  │(Event Track) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Postgres    │  │    Redis     │  │   S3 Bucket  │      │
│  │ (Persistent) │  │ (Rooms/Cache)│  │  (Images)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Client:**

- SvelteKit (with TypeScript)
- Tailwind CSS
- Socket.IO client
- Leaflet (maps)
- QRCode.js
- Web Speech API

**Server:**

- Node.js 20+ (TypeScript)
- Express.js
- Socket.IO
- Prisma ORM
- Redis (ioredis)
- JWT authentication
- Zod (validation)

**Infrastructure:**

- Postgres 15+
- Redis 7+
- Docker + Docker Compose
- Nginx (reverse proxy)
- S3-compatible storage

---

## Database Schema (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  displayName   String
  role          Role      @default(HOST)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  packs         Pack[]
  hostedMatches Match[]

  @@index([email])
}

enum Role {
  HOST
  ADMIN
  CREATOR
}

model Pack {
  id          String    @id @default(cuid())
  ownerId     String
  owner       User      @relation(fields: [ownerId], references: [id])

  meta        Json      // sport, team, locale, title, difficulty, version
  innings     Json      // array of inning objects with questions
  tags        String[]
  isFeatured  Boolean   @default(false)
  isKidsSafe  Boolean   @default(false)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  matches     Match[]

  @@index([ownerId])
  @@index([isFeatured])
}

model Match {
  id          String      @id @default(cuid())
  hostId      String
  host        User        @relation(fields: [hostId], references: [id])
  packId      String
  pack        Pack        @relation(fields: [packId], references: [id])

  joinCode    String      @unique
  mode        MatchMode   @default(NINE_INNINGS)
  status      MatchStatus @default(LOBBY)
  settings    Json        // grandSlam, speedBonus, timerSec, etc.

  startedAt   DateTime?
  endedAt     DateTime?
  createdAt   DateTime    @default(now())

  players     MatchPlayer[]
  answers     MatchAnswer[]

  @@index([hostId])
  @@index([joinCode])
  @@index([status])
}

enum MatchMode {
  NINE_INNINGS
  BEST_OF_3
  BEST_OF_5
}

enum MatchStatus {
  LOBBY
  IN_PROGRESS
  COMPLETED
  ABANDONED
}

model MatchPlayer {
  id        String   @id @default(cuid())
  matchId   String
  match     Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)

  nickname  String
  avatar    String?
  city      String?
  socketId  String?

  joinedAt  DateTime @default(now())
  leftAt    DateTime?

  answers   MatchAnswer[]

  @@index([matchId])
  @@index([socketId])
}

model MatchAnswer {
  id            String      @id @default(cuid())
  matchId       String
  match         Match       @relation(fields: [matchId], references: [id], onDelete: Cascade)
  playerId      String
  player        MatchPlayer @relation(fields: [playerId], references: [id], onDelete: Cascade)

  inningIdx     Int
  questionIdx   Int
  choice        String
  isCorrect     Boolean
  answerMs      Int         // time taken to answer
  bonusAwarded  Boolean     @default(false)

  createdAt     DateTime    @default(now())

  @@index([matchId, playerId])
  @@unique([matchId, playerId, inningIdx, questionIdx])
}

model AnalyticsEvent {
  id          String   @id @default(cuid())
  matchId     String?
  playerId    String?
  eventType   String   // match_created, player_joined, answer_submitted, etc.
  payload     Json
  createdAt   DateTime @default(now())

  @@index([matchId])
  @@index([eventType])
  @@index([createdAt])
}
```

---

## API Specification

### HTTP Endpoints (REST)

#### Authentication

```
POST   /api/auth/register          Register new host
POST   /api/auth/login             Login (returns JWT)
POST   /api/auth/logout            Logout
GET    /api/auth/me                Get current user
```

#### Packs

```
GET    /api/packs                  List available packs (with filters)
GET    /api/packs/:id              Get pack details
POST   /api/packs/import           Import pack (CSV/JSON)
PUT    /api/packs/:id              Update pack
DELETE /api/packs/:id              Delete pack
POST   /api/packs/:id/validate     Validate pack structure
```

#### Matches

```
POST   /api/matches                Create new match
GET    /api/matches/:id            Get match details
GET    /api/matches/:id/summary    Get match summary (post-game)
DELETE /api/matches/:id            Cancel match
```

#### Admin

```
GET    /api/admin/stats            Platform statistics
PUT    /api/packs/:id/feature      Feature/unfeature pack
PUT    /api/packs/:id/moderate     Moderate pack content
```

### Socket.IO Events

#### Client → Server

**Lobby Events:**

```typescript
// Player joins match
socket.emit('player:join', {
  matchId: string,
  nickname: string,
  avatar?: string,
  cityOptIn: boolean,
  city?: string
})

// Host starts match
socket.emit('host:start', {
  matchId: string
})
```

**Gameplay Events:**

```typescript
// Player submits answer
socket.emit('answer:submit', {
  matchId: string,
  questionId: string,
  choice: string,
  clientLatencyMs: number,
});

// Player sends reaction
socket.emit('reaction:send', {
  matchId: string,
  emoji: string,
});

// Host controls
socket.emit('host:action', {
  matchId: string,
  action: 'pause' | 'resume' | 'skip' | 'reveal' | 'stretch',
});
```

#### Server → Clients

**State Updates:**

```typescript
// Match state update
socket.on('state:update', {
  phase: 'lobby' | 'question' | 'reveal' | 'stretch' | 'postgame',
  inning: number,
  question?: QuestionPayload,
  endsAt?: number,
  lineScore: number[],
  leaderboard: PlayerScore[]
})

// Player joined
socket.on('player:joined', {
  playerId: string,
  nickname: string,
  avatar?: string
})

// Player left
socket.on('player:left', {
  playerId: string
})
```

**Gameplay Events:**

```typescript
// Question shown
socket.on('question:show', {
  questionId: string,
  type: string,
  text: string,
  choices?: string[],
  mediaUrl?: string,
  timerSec: number,
  inning: number
})

// Question reveal
socket.on('question:reveal', {
  questionId: string,
  correctAnswer: string,
  correctIndex?: number,
  clipUrl?: string,
  playerResults: {
    playerId: string,
    isCorrect: boolean,
    runsAwarded: number
  }[]
})

// Score update
socket.on('score:update', {
  leaderboard: PlayerScore[],
  lineScore: number[]
})

// Reaction broadcast
socket.on('reaction:broadcast', {
  playerId: string,
  emoji: string
})

// Stretch start
socket.on('stretch:start', {
  clipUrl: string,
  durationSec: number
})

// Match end
socket.on('match:end', {
  finalScores: PlayerScore[],
  mvp: string,
  shareCardUrl: string
})
```

---

## Component Hierarchy

### Player App (Mobile-First)

```
PlayerApp/
├── JoinScreen/
│   ├── JoinForm (nickname, avatar selector)
│   ├── LocationOptIn
│   └── JoinButton
├── LobbyScreen/
│   ├── PlayerList
│   ├── PackInfo
│   └── WaitingMessage
├── GameScreen/
│   ├── GameHeader (inning, timer)
│   ├── QuestionDisplay
│   │   ├── MultipleChoice
│   │   ├── TrueFalse
│   │   ├── Closest
│   │   └── MediaQuestion
│   ├── AnswerButtons
│   ├── ReactionBar (emoji buttons)
│   ├── Leaderboard (collapsible)
│   └── LineScore
├── StretchScreen/
│   ├── ClipEmbed
│   └── StretchTimer
├── PostgameScreen/
│   ├── FinalScores
│   ├── MVPBanner
│   └── ShareCard
└── AccessibilityControls/
    ├── BigTextToggle
    ├── ReadAloudButton
    └── HighContrastToggle
```

### Host Console (Desktop)

```
HostConsole/
├── Dashboard/
│   ├── MatchList
│   └── CreateMatchButton
├── MatchSetup/
│   ├── PackSelector
│   ├── SettingsPanel
│   │   ├── ModeSelect
│   │   ├── TimerConfig
│   │   ├── GrandSlamToggle
│   │   └── SpeedBonusToggle
│   └── CreateButton
├── LobbyManagement/
│   ├── JoinCodeDisplay
│   ├── QRCodeDisplay
│   ├── PlayerList (with kick option)
│   └── StartButton
├── LiveMatchControl/
│   ├── CurrentQuestion
│   ├── ControlPanel
│   │   ├── PauseButton
│   │   ├── SkipButton
│   │   └── StretchButton
│   ├── LiveLeaderboard
│   ├── AnswerFeed (real-time)
│   └── HeckleInjector
└── PostMatch/
    ├── Summary
    ├── Analytics
    └── ExportButton
```

### TV Display (Full-Screen)

```
TVDisplay/
├── JoinScreen/
│   ├── QRCodeLarge
│   ├── JoinURL
│   └── PlayerCount
├── InningTransition/
│   ├── InningNumber
│   └── ThemeTitle
├── QuestionScreen/
│   ├── QuestionText (large)
│   ├── ChoicesGrid
│   ├── TimerBar
│   └── LineScore
├── RevealScreen/
│   ├── CorrectAnswer (highlighted)
│   ├── LeaderboardTop5
│   └── ClipEmbed (if applicable)
├── StretchScreen/
│   ├── ClipEmbed (full-screen)
│   └── CountdownOverlay
└── PostgameScreen/
    ├── FinalStandings
    ├── MVPSpotlight
    └── ThankYouMessage
```

---

## Development Tickets

### Epic 1: Foundation (Week 1-2)

**Ticket 1.1: Project Scaffolding**

- **Story:** As a developer, I need a properly configured monorepo so I can start building features
- **Tasks:**
  - [ ] Initialize SvelteKit client with TypeScript + Tailwind
  - [ ] Initialize Express server with TypeScript
  - [ ] Configure shared types package
  - [ ] Set up ESLint, Prettier, Husky
  - [ ] Create Docker Compose (Postgres + Redis)
  - [ ] Configure environment variables
- **AC:** `npm install` works, `npm run dev` starts both client and server

**Ticket 1.2: Prisma Schema & Migrations**

- **Story:** As a developer, I need a database schema so I can persist application data
- **Tasks:**
  - [ ] Define Prisma schema (User, Pack, Match, MatchPlayer, MatchAnswer, AnalyticsEvent)
  - [ ] Create initial migration
  - [ ] Add seed script with sample packs
  - [ ] Generate Prisma client
- **AC:** `npx prisma migrate dev` succeeds, seed data loads

**Ticket 1.3: Authentication System**

- **Story:** As a host, I need to register and log in so I can create matches
- **Tasks:**
  - [ ] Implement bcrypt password hashing
  - [ ] Create JWT signing/verification utilities
  - [ ] Build `/api/auth/register` endpoint
  - [ ] Build `/api/auth/login` endpoint
  - [ ] Create auth middleware for protected routes
- **AC:** Host can register, log in, access protected routes

**Ticket 1.4: Socket.IO Infrastructure**

- **Story:** As a developer, I need Socket.IO configured so real-time features work
- **Tasks:**
  - [ ] Set up Socket.IO server with JWT auth
  - [ ] Implement room management (join/leave)
  - [ ] Create Redis adapter for scalability
  - [ ] Add connection/disconnection handlers
  - [ ] Add error handling and reconnection logic
- **AC:** Client connects, joins room, receives broadcasts

### Epic 2: Match Management (Week 2)

**Ticket 2.1: Pack Import & Validation**

- **Story:** As a host, I can import a trivia pack so I can run games
- **Tasks:**
  - [ ] Build Zod schema for pack validation
  - [ ] Implement CSV parser
  - [ ] Create `/api/packs/import` endpoint
  - [ ] Add pack preview generator
  - [ ] Store pack in Postgres
- **AC:** Valid pack imports successfully, invalid pack returns errors

**Ticket 2.2: Match Creation**

- **Story:** As a host, I can create a match with a selected pack
- **Tasks:**
  - [ ] Build `/api/matches` POST endpoint
  - [ ] Generate unique join code (6 chars)
  - [ ] Generate QR code URL
  - [ ] Initialize match state in Redis
  - [ ] Store match record in Postgres
- **AC:** Match created, returns joinCode and QR URL

**Ticket 2.3: Match State Machine**

- **Story:** As a developer, I need a state machine to manage match flow
- **Tasks:**
  - [ ] Define state types: `lobby | question | reveal | stretch | postgame`
  - [ ] Implement state transitions
  - [ ] Add inning progression logic
  - [ ] Build 7th-inning stretch detection
  - [ ] Store state in Redis
- **AC:** State transitions correctly, 7th stretch triggers

### Epic 3: Gameplay Engine (Week 2-3)

**Ticket 3.1: Player Join Flow**

- **Story:** As a player, I can join a match via QR/URL
- **Tasks:**
  - [ ] Build join screen UI (nickname + avatar)
  - [ ] Implement `player:join` Socket.IO event
  - [ ] Store player in MatchPlayer table
  - [ ] Broadcast `player:joined` to all clients
  - [ ] Handle reconnection (same nickname)
- **AC:** Player joins, appears in lobby for all clients

**Ticket 3.2: Question Broadcasting**

- **Story:** As a system, I broadcast questions to all players simultaneously
- **Tasks:**
  - [ ] Implement `question:show` event
  - [ ] Shuffle answer choices per player
  - [ ] Calculate timer end timestamp
  - [ ] Broadcast to all room clients
  - [ ] Start server-side timer
- **AC:** All players receive question within 200ms

**Ticket 3.3: Answer Submission & Scoring**

- **Story:** As a player, I submit an answer and see if I'm correct
- **Tasks:**
  - [ ] Build `answer:submit` handler
  - [ ] Validate answer (lock after first submit)
  - [ ] Calculate score (+1 or +4 for grand slam)
  - [ ] Store answer in MatchAnswer table
  - [ ] Update leaderboard in Redis
- **AC:** Answer locks, score updates, leaderboard reflects changes

**Ticket 3.4: Latency Normalization (Speed Bonus)**

- **Story:** As a system, I fairly award speed bonuses accounting for network latency
- **Tasks:**
  - [ ] Collect client-reported latency
  - [ ] Calculate normalized answer time
  - [ ] Award +1 to fastest 5 (if enabled)
  - [ ] Store bonus flag in MatchAnswer
- **AC:** Speed bonus awarded fairly regardless of latency

**Ticket 3.5: Question Reveal**

- **Story:** As a player, I see correct answer and scores after timer ends
- **Tasks:**
  - [ ] Implement `question:reveal` event
  - [ ] Calculate who answered correctly
  - [ ] Embed YouTube clip (if specified)
  - [ ] Broadcast results to all clients
  - [ ] Update line score by inning
- **AC:** Correct answer highlighted, clip plays, scores updated

### Epic 4: Client UIs (Week 3-4)

**Ticket 4.1: Player App - Join & Lobby**

- **Story:** As a player, I have a clean mobile-first join experience
- **Tasks:**
  - [ ] Build JoinScreen component
  - [ ] Build LobbyScreen component
  - [ ] Add location opt-in toggle
  - [ ] Implement Socket.IO connection
  - [ ] Handle loading/error states
- **AC:** Player can join from mobile, see lobby updates

**Ticket 4.2: Player App - Game Screen**

- **Story:** As a player, I answer questions and see my score
- **Tasks:**
  - [ ] Build GameScreen layout
  - [ ] Implement QuestionDisplay (all types)
  - [ ] Build AnswerButtons with selection state
  - [ ] Add timer bar animation
  - [ ] Build collapsible Leaderboard
  - [ ] Add LineScore component
- **AC:** Player answers questions, sees real-time updates

**Ticket 4.3: Player App - Reactions & Heckles**

- **Story:** As a player, I can send reactions and see heckles
- **Tasks:**
  - [ ] Build ReactionBar with emoji buttons
  - [ ] Throttle reaction sends (1 per 2s)
  - [ ] Animate reaction bursts
  - [ ] Display contextual heckles
- **AC:** Reactions animate, heckles display

**Ticket 4.4: Host Console - Match Setup**

- **Story:** As a host, I configure and start a match
- **Tasks:**
  - [ ] Build Dashboard with match list
  - [ ] Build MatchSetup screen
  - [ ] Implement PackSelector
  - [ ] Build SettingsPanel
  - [ ] Add CreateMatchButton
- **AC:** Host creates match with custom settings

**Ticket 4.5: Host Console - Live Control**

- **Story:** As a host, I control match flow in real-time
- **Tasks:**
  - [ ] Build LiveMatchControl screen
  - [ ] Add pause/resume functionality
  - [ ] Add skip inning button
  - [ ] Add stretch trigger
  - [ ] Build live answer feed
- **AC:** Host controls work, match responds

**Ticket 4.6: TV Display - All Screens**

- **Story:** As a host, I cast the game to a TV for everyone to see
- **Tasks:**
  - [ ] Build JoinScreen with large QR
  - [ ] Build QuestionScreen (large text)
  - [ ] Build RevealScreen with top 5 leaderboard
  - [ ] Build StretchScreen
  - [ ] Add inning transitions with animations
- **AC:** TV display renders correctly on 1080p+ displays

### Epic 5: Social & Accessibility (Week 4-5)

**Ticket 5.1: Geolocation Map**

- **Story:** As a player, I can see where other players are (city-level)
- **Tasks:**
  - [ ] Integrate Leaflet
  - [ ] Collect city from player join
  - [ ] Plot city pins on map
  - [ ] Add seating overlay mode
  - [ ] Implement privacy toggle
- **AC:** Map shows city pins, no exact GPS exposed

**Ticket 5.2: Accessibility Features**

- **Story:** As a player with accessibility needs, I can fully participate
- **Tasks:**
  - [ ] Implement Big-Text mode (28pt+)
  - [ ] Add read-aloud button (Web Speech API)
  - [ ] Build high contrast theme
  - [ ] Ensure color-blind safe palette
  - [ ] Add keyboard navigation
  - [ ] Add screen reader labels
- **AC:** Passes WCAG 2.1 AA compliance

**Ticket 5.3: Postgame & Sharing**

- **Story:** As a player, I see final results and can share them
- **Tasks:**
  - [ ] Build PostgameScreen
  - [ ] Calculate MVP (top score, earliest time)
  - [ ] Generate shareable card (PNG)
  - [ ] Add social share buttons
- **AC:** Postgame displays, share card generates

### Epic 6: Testing & Launch (Week 5-6)

**Ticket 6.1: Unit & Integration Tests**

- **Story:** As a developer, I have confidence code works correctly
- **Tasks:**
  - [ ] Write tests for scoring engine
  - [ ] Test pack validation
  - [ ] Test state machine transitions
  - [ ] Test Socket.IO events
  - [ ] Test answer deduplication
- **AC:** ≥80% code coverage on critical paths

**Ticket 6.2: E2E Tests**

- **Story:** As a QA engineer, I can validate full game flows
- **Tasks:**
  - [ ] Set up Playwright
  - [ ] Write test: Create match → Join players → Complete game
  - [ ] Test reconnection mid-game
  - [ ] Test accessibility features
  - [ ] Test cross-browser compatibility
- **AC:** E2E tests pass on Chrome, Firefox, Safari

**Ticket 6.3: Load Testing**

- **Story:** As a platform owner, I know the system handles 100+ concurrent players
- **Tasks:**
  - [ ] Set up k6 or Artillery
  - [ ] Simulate 100 players joining
  - [ ] Simulate 100 players answering within 5s
  - [ ] Monitor Redis/Postgres performance
  - [ ] Identify bottlenecks
- **AC:** No dropped events, <200ms latency under load

**Ticket 6.4: Analytics Implementation**

- **Story:** As a product owner, I track key metrics
- **Tasks:**
  - [ ] Implement event tracking
  - [ ] Track: match_created, player_joined, answer_submitted, etc.
  - [ ] Build host dashboard
  - [ ] Add basic reporting
- **AC:** All events tracked, dashboard displays metrics

---

## Acceptance Criteria Summary (MVP)

From PRD Section 16, verified against implementation:

- **A1. Join:** ✅ Player joins via QR/URL <30s on mid-tier mobile
- **A2. Questions:** ✅ All players receive question within 200ms, answer locks after submit
- **A3. Scoring:** ✅ +1 per correct, +4 for grand slam, leaderboard updates <300ms
- **A4. Stretch:** ✅ Host triggers 30s media segment on all clients
- **A5. Map:** ✅ City-level map renders when ≥1 player opts in
- **A6. Accessibility:** ✅ Big-Text ≥28pt, read-aloud speaks full question
- **A7. Reliability:** ✅ Player refreshes and rejoins without losing answers

---

## Next Steps

1. **Team Setup:** Assign tickets to frontend, backend, and full-stack developers
2. **Sprint Planning:** Break into 2-week sprints aligned with milestones
3. **Prototype:** Build vertical slice (Week 1) to validate architecture
4. **Beta Testing:** Recruit 5-10 test hosts for Week 5 beta
5. **Phase 2 Planning:** Start planning Series & Brackets during Week 6

---

## Risk Mitigation

**Technical Risks:**

- Socket.IO at scale → Load test early (Week 3), add Redis adapter
- Real-time sync issues → Implement latency monitoring, fallback to HTTP polling
- Mobile performance → Profile on low-end devices (Week 4)

**Product Risks:**

- Onboarding friction → User test join flow (Week 3)
- Content quality → Pre-curate 10 packs, add moderation tools
- Geolocation privacy → Clear consent UI, city-only default

**Resource Risks:**

- Scope creep → Lock MVP features, defer Phase 2 enhancements
- Testing time → Automate early, allocate full Week 6 for QA

---

**Ready to build!** 🚀
