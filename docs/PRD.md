# PRD — **Fan Playoffs: Hyper-Social Trivia**

**Owner:** You
**Doc type:** Product Requirements Document (PRD)
**Version:** v1.0
**Status:** Draft for build planning

---

## 1) Problem, Vision, Success

**Problem**
Sports trivia is fun in small groups, but most tools feel like school quizzes. They’re not built for watch-parties, multiple age groups, or “we’re-all-fans” energy. Hosts need something simple, social, and scalable from a living-room to a packed bar.

**Vision**
A hyper-social, playoff-style trivia platform that feels like a game night and a playoff run had a baby: short matches (innings/periods), series, brackets, and seasons—wrapped in fan reactions, highlight clips, optional geolocation crowd maps, and “heckle” humor.

**North-star outcome**
Players feel like they participated in a _game_, not a test. Venues and communities can run leagues, creators can publish packs, and fans of any age can jump in within 30 seconds.

**Primary KPIs**

- D1 game completion rate ≥ **85%**
- Avg players/session (hosted) ≥ **12**
- 30-day retention (hosts) ≥ **25%**
- Content reuse (packs used ≥3 times in 30 days) ≥ **40%**
- NPS (players) ≥ **55**

---

## 2) Target Users & Use Cases

**Personas**

- **Host Hannah (bar/club/teacher/parent):** Wants quick setup, QR join, TV display, simple controls.
- **Fan Frank (50+, hardcore):** Wants nostalgia, clips, no fiddly UI, big text, jokes.
- **Family Fiona (mixed ages):** Wants inclusive difficulty, chill timers, read-aloud.
- **Creator Chris:** Wants to upload/curate team packs and get distribution.

**Core use cases**

1. **Pickup Game (9 Innings)** at home or bar, 10–30 players, mobile join, TV scoreboard.
2. **Best-of-3 Series** between squads in a Discord or alumni group.
3. **Venue League Night** with bracketed tournament and weekly standings.
4. **Watch-Party Mode** during live sports (fast rounds between commercials).

---

## 3) Product Scope

### In-scope (MVP → Season 1)

- **Game formats:** 9-inning match (1–2 Qs/inning), optional “Grand Slam” final (4 runs).
- **Social:** Emoji bursts, “Fan Heckle Mode” (pre-written cajoles), reveal clips (YouTube embeds).
- **Accessibility:** Big Text Mode, high contrast, read-aloud questions, color-blind safe.
- **Geolocation (opt-in):** City-level pins + “stadium seating” overlay (fun, not precise).
- **Host Console:** start/skip inning, pause, inject heckle, trigger media.
- **TV Display:** QR join + line score by inning + hype transitions.
- **Packs:** JSON/CSV import; validation; themes per inning; difficulty tags.
- **Scoring:** 1 run per correct; “Grand Slam” = 4 runs; optional fastest-five +1 (toggle).
- **Anti-cheat (light):** Choice shuffle per player, short timers, latency normalization for speed points.
- **Data:** Player/session stats, leaderboards, simple Elo seeding for brackets.
- **Privacy:** Per-match consent for location; city-only map by default.

**Out of scope (v1)**

- Real-money prizes, full identity verification, proprietary video hosting, Twitch/YT live integration, complex friend graphs.

---

## 4) Experience Design

### Match Flow (default 9-inning)

1. **Lobby (≤60s):** QR/URL join → select nickname/avatar → (optional) allow location.
2. **Innings (9 rounds):** 1–2 questions, 12–20s timers, 1 run per correct.
3. **7th-Inning Stretch:** 30s clip or meme vote; optional no-score palate cleanser.
4. **Grand Slam (Inning 9):** final question = 4 runs.
5. **Postgame:** Inning line score, MVP, shareable card.

### Question Types

- `mc` (multiple choice), `tf`, `closest` (numeric), `media` (photo/clip identification), `map` (identify city/stadium), `chain` (2-part).

### Social Layer

- **Reactions:** Tap to burst (💥🧢🦜🔥).
- **Heckles:** Contextual one-liners (random or host-triggered).
- **Clips:** Embedded highlights at reveal (YouTube timestamp links).
- **Map:** Leaflet pins or seating overlay; location defaults to **city**.

### Accessibility Defaults

- 18–20pt base font on mobile; 28–36pt Big-Text toggle.
- Read-aloud button per question (Web Speech API).
- Color-blind safe palette; motion-reduced transitions if prefers-reduced-motion.

---

## 5) Content Model

### Pack Schema (v1)

```json
{
  "meta": {
    "sport": "mlb",
    "team": "toronto-blue-jays",
    "locale": "en-CA",
    "title": "Jays Classics",
    "difficulty": "mixed",
    "version": "1.0.0"
  },
  "innings": [
    {
      "theme": "Origins",
      "questions": [
        {
          "type": "mc",
          "text": "Inaugural year?",
          "choices": ["1975", "1976", "1977", "1978"],
          "correctIndex": 2
        }
      ]
    },
    {
      "theme": "Legends",
      "questions": [
        /* … */
      ]
    }
  ]
}
```

**Validation rules**

- 9 innings present; each has ≥1 question.
- `mc.choices` length 2–6; `correctIndex` within bounds.
- `media.url` must be embeddable; `map.expected` must be a city/stadium in canonical list.

---

## 6) Functional Requirements

### Host/Player

- **R1.** Players join via QR/URL; pick nickname; optional avatar; optional location (city).
- **R2.** Host can start/pause/skip inning; inject heckle; trigger media reveal.
- **R3.** Questions broadcast in real time; client shows timer bar; submits answer once (lock after).
- **R4.** Scoring: +1 run for correct; “Grand Slam” question worth 4 runs; (toggle) +1 for fastest-five with latency normalization.
- **R5.** Leaderboard and **line score by inning**; MVP = top score tiebreaker “earliest total time.”
- **R6.** 7th-inning stretch shows clip or meme vote (non-scored by default).
- **R7.** Postgame: shareable result card (PNG), replay summary for host.

### Packs & Admin

- **R8.** Creator can import CSV/Google Sheet or JSON; system validates and previews pack.
- **R9.** Pack tagging: era, difficulty, media-safe.
- **R10.** Admin can feature packs, hide problematic content, or mark “kids-safe.”

### Social & Geolocation

- **R11.** Reactions broadcast as bursts (throttled).
- **R12.** Map shows city-level pins; exact GPS never shown; seating overlay mode for privacy.

### Anti-Cheat & Fairness

- **R13.** Shuffle choices per player session.
- **R14.** Speed bonus uses **answerAt - shownAt** minus **client latency estimate**.
- **R15.** Basic duplicate detection: same account/device fingerprint warns host in “prize mode.”

### Observability

- **R16.** Emit analytics: join, answer, correct/incorrect, reaction, stretch participation, drop.
- **R17.** Host dashboard: players joined, median answer time, completion.

---

## 7) Non-Functional Requirements

- **Performance:** Sub-200ms server processing; <2.5s first interaction on 3G.
- **Capacity:** 500 concurrent players per match (v1 target 50–100 typical).
- **Availability:** 99.5% SLA (Phase 2+).
- **Privacy:** GDPR/CPRA aligned; explicit opt-in for location; COPPA gate for kids mode.
- **Security:** Rate limits, auth tokens for host/admin, signed media URLs, no third-party cookies.
- **Accessibility:** WCAG 2.1 AA.

---

## 8) System Design

**Client (recommended)**

- **SvelteKit** (or Next.js) + **Tailwind**
- **Socket.IO client** for rooms & events
- **Leaflet** for maps; **YouTube embeds** for clips

**Server**

- **Node.js (TypeScript)** with **Express** or **NestJS**
- **Socket.IO** for realtime
- **Postgres** (Prisma) for persistent data
- **Redis** for rooms/presence/leaderboards/rate limits
- **S3-compatible** storage for images/thumbnails

**Deployment**

- Single region to start; CDN for static; autoscale app + Redis.
- Feature flags (e.g., LaunchDarkly or simple env toggles).

**Key Services**

- `match-service` (state machine, scoring, events)
- `pack-service` (CRUD/validation)
- `bracket-service` (Phase 2)
- `analytics-service` (event ingestion to warehouse)

---

## 9) Game State & Events

### Match State Machine

`lobby → inning[n]:question → inning[n]:reveal → (stretch at 7th) → … → postgame`

### Socket Events (subset)

- **Server → Clients:**
  `state:update`, `question:show`, `question:reveal`, `score:update`, `stretch:start`, `stretch:end`, `match:end`
- **Client → Server:**
  `player:join {name, avatar, cityOptIn}`, `answer:submit {qId, choice}`, `reaction:send {emoji}`, `host:control {action}`

**Latency normalization**
On `answer:submit`, store `(serverReceiveTs - questionStartTs) - clientReportedLatencyMs` for speed-bonus fairness.

---

## 10) Data Model (simplified)

```
Org(id, name, theme)
User(id, displayName, ageMode, cityOptIn, createdAt)
Pack(id, meta, innings JSONB, ownerId, tags[], isFeatured, isKidsSafe)
Match(id, orgId, packId, mode, startedAt, endedAt, settings JSONB)
MatchPlayer(id, matchId, userId, nickname, avatar, city)
MatchAnswer(id, matchId, userId, inningIdx, qIdx, choice, isCorrect, answerMs, bonusAwarded)
Leaderboard(id, matchId, totals JSONB)
Bracket(id, orgId, name, type, seeds JSONB, rounds JSONB)  // Phase 2
```

---

## 11) APIs (HTTP) & Realtime (Socket)

**HTTP (admin/creator)**

- `POST /api/packs/import` (CSV/JSON) → `{packId}`
- `GET /api/packs/:id` (signed)
- `POST /api/matches` → `{matchId, joinCode}`
- `GET /api/matches/:id/summary` (host)

**Socket (rooms by matchId)**

- `join:match {matchId, nickname, cityOptIn}`
- `host:action {matchId, action: 'start'|'pause'|'skip'|'reveal'|'stretch'}`
- `answer:submit {qId, choice, clientLatencyMs}`
- Broadcasts: `state:update`, `leaderboard`, `clip:reveal {url}`

---

## 12) Scoring & Brackets

**Runs**

- Correct = +1 run.
- Inning 9 Grand Slam = +4.
- (Optional) Speed bonus +1 to fastest five correct, normalized for latency.

**Ties**

- Home Run Derby: 3 quick `tf` questions; most correct wins; still tied → sudden-death.

**Seeding (Phase 2)**

- Elo-like update: `E = 1/(1+10^((Rb-Ra)/400))`, `Ra' = Ra + K*(S - E)`; K=16 default.

---

## 13) Content & Moderation

- Packs tagged by **era**, **difficulty**, **kids-safe**, **media-heavy**.
- Upload flow validates CSV/JSON structure and link embeddability.
- Report flow for problematic questions; admin hide.
- Rights: only **embed** licensed clips (no re-hosting).

---

## 14) Analytics & Reporting

**Events**
`match_created, player_joined, question_shown, answer_submitted, correct, incorrect, reaction_sent, stretch_participated, match_completed, drop_off`

**Dashboards**

- Match funnel: joins → answers → completion.
- Avg answer time; question difficulty index (correct rate).
- Content performance: pack reuse, abandon rate by inning.
- Venue league standings (Phase 2).

---

## 15) Privacy, Security, Compliance

- Location is **opt-in**; default to **city only**; never share exact GPS.
- Kids mode requires guardian confirmation; no location in kids rooms.
- Store minimal PII (nickname by default).
- Rate limit reactions/answers to prevent floods.
- CSRF on HTTP; JWT for host/admin; secure WebSocket upgrade.

---

## 16) Acceptance Criteria (MVP)

- **A1. Join:** Player can join a match via QR/URL within 30s on mid-tier mobile.
- **A2. Questions:** All players receive a question within 200ms of each other; answer locks after submit; server records exactly one answer per player.
- **A3. Scoring:** Correct answers award +1 run; inning 9 correctly awards +4; leaderboard updates in ≤300ms.
- **A4. Stretch:** Host can trigger a 30s media segment that plays on TV and clients.
- **A5. Map:** If ≥1 player opts in, a city-level map renders; disabling location hides map immediately.
- **A6. Accessibility:** Big-Text Mode increases base font ≥28pt; read-aloud speaks full question text.
- **A7. Reliability:** If a player refreshes, they rejoin the current inning without losing prior answers.

---

## 17) QA Plan (high level)

- **Unit:** scoring, latency normalization, pack validation.
- **Integration:** socket rooms, reconnection mid-inning, TV display sync.
- **Load:** 100 concurrent players answering within 5s; no dropped events.
- **Accessibility:** keyboard navigation, screen reader labels, contrast checks.
- **Cross-device:** iOS Safari, Android Chrome, desktop Chrome/Edge/Firefox, AirPlay/Chromecast TV.

---

## 18) Risks & Mitigations

- **Clip rights confusion** → Only allow embeds; educate creators; pre-curate official links.
- **Network variability** → Latency-normalized speed bonus; Chill Mode without speed points.
- **Onboarding friction** → QR + no account required for players; hosts sign-in only.
- **Geolocation privacy** → City-only default; per-match consent; clear toggle.

---

## 19) Roadmap

**Phase 1 — MVP (Pickup Game) [4–6 weeks]**

- 9-inning match, packs import/validate, host console, TV display, reactions, heckles, Big-Text, read-aloud, city-level map, basic analytics.

**Phase 2 — Series & Brackets [4–6 weeks]**

- Best-of-3/5/7, bracket UI, Elo seeding, venue league night preset, prize mode safeguards.

**Phase 3 — Marketplace & Skins [6–8 weeks]**

- Creator portal, pack discovery, team/league skins, seasonal themes, richer analytics, sponsorship hooks.

---

## 20) Build Checklist (Tech)

- [ ] SvelteKit client with Tailwind + Socket.IO client
- [ ] Express/NestJS API + Socket.IO gateway
- [ ] Redis rooms, presence, reaction throttles
- [ ] Postgres (Prisma) schema migration
- [ ] Pack import validator (CSV/JSON) + preview
- [ ] Match state machine + scoring engine
- [ ] TV display route (`/tv/:matchId`) with QR and line score
- [ ] Accessibility: Big-Text, read-aloud, color-safe themes
- [ ] Leaflet map with city-level pins; seating overlay option
- [ ] Analytics pipeline (server events → DB/warehouse)

---

## 21) Sample Payloads

**Create Match (HTTP)**

```json
POST /api/matches
{
  "packId": "pack_123",
  "mode": "nine_innings",
  "settings": { "grandSlam": true, "speedBonus": false, "timerSec": 18 }
}
```

**State Broadcast (Socket)**

```json
{
  "phase": "question",
  "inning": 5,
  "question": {
    "id": "q_5_1",
    "type": "mc",
    "text": "Who hit the 1993 walk-off?",
    "choices": ["Carter", "Alomar", "Olerud", "Molitor"]
  },
  "endsAt": 1738282828000,
  "lineScore": { "innings": [1, 0, 2, 0, 1, 0, 0, 0, null], "total": 4 },
  "leaderboard": [
    { "name": "Nate", "runs": 4 },
    { "name": "Jeff", "runs": 3 }
  ]
}
```

---

If you want, I can convert this PRD into:

- a **ticket set** (user stories + acceptance criteria) for your backlog,
- a **Postgres schema + Prisma models**, and
- a **UI wireframe kit** (host console, player, TV) you can hand straight to devs/design.
