# Createrington Market & Community Portal

![Node.js](https://img.shields.io/badge/Node.js-22-green?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-DB-336791?logo=postgresql)
![Discord](https://img.shields.io/badge/Discord-Integration-7289da?logo=discord&logoColor=white)
![Minecraft](https://img.shields.io/badge/Minecraft-Server-5E7C16?logo=minecraft&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white)

Welcome to **Createrington**, a full‑stack community portal that unifies a Minecraft server, Discord community and browser‑based web client into one seamless experience. The project not only provides traditional features like play‑time tracking and whitelist management but also incorporates a novel **memecoin market**, a **wait‑list/application system**, an **OpenAI‑powered assistant** and extensive **role automation** across Discord and fun web games. This README explains the purpose of the project, its architectural components, how to set up and run your own instance, and gives an overview of the REST API.

## Project Goals

Createrington was designed to unify fragmented community platforms. Instead of having separate tools for Minecraft, Discord, and user onboarding, this project merges them into a single, feature-rich portal. The goal is to foster deeper engagement, community fun (via memecoins/games), and smooth server administration.

---

## Table of contents

- [Key features](#key-features)
- [Architecture overview](#architecture-overview)
- [Installation & setup](#installation--setup)
- [Scripts](#scripts)
- [Tech Stack](#tech-stack)
- [Configuration](#configuration)
- [Running the project](#running-the-project)
- [API overview](#api-overview)
- [Services & cron jobs](#services--cron-jobs)
- [Market & crypto module](#market--crypto-module)
- [AI assistant](#ai-assistant)
- [Contributing](#contributing)
- [Related Projects](#related-projects)
- [License & disclaimer](#license--disclaimer)

---

## Key features

Createrington is more than a simple web front‑end; it is a **complete ecosystem** linking Minecraft gameplay to Discord and a browser client. Highlights include:

### Secure registration and verification

Players register for the Minecraft server using a one‑time token sent via the website. The backend verifies the token and fetches the associated Discord user. It rejects invalid or expired tokens and prevents duplicate registrations.

### Unified chat bridge

Real‑time two‑way chat sync: messages from the Minecraft server, Discord, and the web chat appear across all platforms using Socket.io and Discord.js.

### Play‑time tracking & automatic roles

The server tracks total playtime and automatically assigns Discord roles:

- Stone: 0–20 hours
- Copper: 20–40 hours
- And so on...

The `assignPlaytimeRoles` service manages this, and a daily "Top Player" role is awarded based on hours played.

### Whitelist & wait‑list system

Users can apply via the website. Admins approve applications via:

- `/api/apply` for submissions
- `/api/wait-list` for queueing

### Image uploads & gallery

Players can upload screenshots from the web client. The `/api/upload-image` endpoint handles file uploads using multer and forwards them to a Discord channel (10MB limit by default).

### Player statistics & leaderboards

Includes:

- `/api/playerCount` and `/api/players` for online status
- Live Socket.io events and leaderboard pages on the web client

### Integrated currency & crypto market

- Trade, earn, deposit/withdraw funds
- Memecoins simulate a volatile market
- All endpoints protected via JWT

### AI assistant

OpenAI‑powered bot responds to market/token questions in Discord only. Declines unrelated topics and limits users to daily messages.

### Admin control panel

Admin features:

- RCON command execution
- View/manage users
- Moderate content
- JWT-based session validation and cookie-auth for login

---

## Screenshots

### Homepage

![Homepage](./docs/screenshots/homepage.png)

### Crypto Market

![Crypto Market](./docs/screenshots/market-homepage.png)

### Crypto Chart

![Crypto Chart](./docs/screenshots/market-chart.png)

### Unified Chat

![Web Chat](./docs/screenshots/web-chat.png)
![Discord Chat](./docs/screenshots/discord-chat.png)
![Minecraft Chat](./docs/screenshots/minecraft-chat.png)

### Admin Panel

![Admin Panel](./docs/screenshots/admin-panel.png)

---

## Architecture overview

### Server

- **Node.js + Express** (`server.js`): configures middleware, WebSockets, database, routes, services.
- **Routes**: `server/routes/`

  - `/api/playerCount`, `/api/players`
  - `/api/verify-token`
  - `/api/apply`, `/api/wait-list`
  - `/api/upload-image`, `/api/user`, `/api/admin`
  - `/api/currency`, `/api/market`

- **Services**: `server/services/`

  - `assignPlaytimeRoles.js`, `marketBoard.js`, `updateMemecoinPrices.js`

- **Cron Jobs**: Scheduled via `jobs/cronJobs.js`
- **Discord Integration**: Handles roles, chat commands, leaderboards

### Client

- **React + Vite** (`client/`)
- **vite.config.js**: proxies `/api` to backend
- **Components**: chat, market, leaderboards, admin
- **Libraries**: React Router, Socket.io-client, Three.js, Chart.js, AOS

---

## Tech Stack

Createrington is powered by a full-stack modern web architecture:

- **Frontend**: React, Vite, AOS, Chart.js, Socket.io-client, Three.js
- **Backend**: Node.js, Express, PostgreSQL, Discord.js, Multer, RCON
- **Integrations**: Discord API, OpenAI API, Minecraft server
- **Auth**: JWT, session cookies
- **Infrastructure**: Cron jobs, REST API, WebSockets

<p align="center">
  <img src="https://skillicons.dev/icons?i=nodejs,react,postgres,discord,express,js,openai,socketio" />
</p>

---

## Installation & setup

### Prerequisites

- Node.js v20+
- PostgreSQL DB
- Discord bot (token, client ID, OAuth)
- Minecraft server with RCON

### Cloning & installing

```bash
git clone https://github.com/matejhozlar/mc-page.git
cd mc-page
cd server && npm install
cd ../client && npm install
```

### Database Setup

You can set up the PostgreSQL database using the provided schema file or manually following these steps:

#### Option 1: Use Provided Schema

1. **Ensure PostgreSQL is installed and running.**

2. **Create a new database:**

   ```bash
   createdb mc_server
   ```

3. **Import schema into the database:**

   ```bash
   psql -U your_user -d mc_server -f db/init.sql
   ```

   > Replace `your_user` with your PostgreSQL username.

---

#### Option 2: Manual Setup (for contributors)

You can infer the necessary schema by exploring the relevant route and service files (useful for understanding the data flow):

- **`currencyMod.js`** → Defines logic for currency, transactions, and `user_funds`
- **`auth.js` / `tokens.js`** → Suggests tables like `users`, `chat_tokens`, `verified_discords`
- **`applications.js`** → Requires `applications` table with `mc_name`, `dc_name`, etc.
- **`cryptoMarket.js`** → Needs `crypto_tokens`, `user_tokens`, `token_transactions`

---

### Schema File Location

The full schema (safe for public use) can be found in:

```
/db/init.sql
```

Use that file to set up a clean database with all constraints, sequences, indexes, triggers, and foreign keys.

### Environment variables

Copy `.env.example` to `.env` in `server/` and fill:

- `DATABASE_URL`, `DISCORD_TOKEN`, `RCON_*`
- `JWT_SECRET`, `SESSION_SECRET`, etc.
- Optional: SMTP, market options, role IDs

---

## Running the project

### Development

```bash
# Server
cd server && npm run dev
# Client
cd ../client && npm run dev
```

### Production

```bash
cd client && npm run build
cd ../server && NODE_ENV=production npm start
```

Serve static files from `client/dist` and use a reverse proxy (e.g., Nginx).

---

## Scripts

### Client

| Script                | Description                       |
| --------------------- | --------------------------------- |
| `npm run dev`         | Starts the dev environment        |
| `npm run build`       | Builds the application            |
| `npm run cleanup-css` | Cleans up css                     |
| `npm run usage-css`   | Locates css classes in components |

#### cleanup-css

This script scans a component-specific CSS file and removes any matching class selectors from the global index.css file, helping avoid duplication and keeping your global styles clean.

#### usage-css

This script searches your React components for usage of a specific CSS class name and tells you where it's used. It's useful for identifying whether a class is local, shared, or unused, especially during CSS cleanup or refactoring.

---

### Server

| Script                       | Description                          |
| ---------------------------- | ------------------------------------ |
| `npm start`                  | Start the production server          |
| `npm run dev`                | Start dev server with nodemon        |
| `npm run test`               | Runs the test files                  |
| `npm run gen-env`            | Generates required env vars          |
| `npm run find-env`           | Locates env variables in the project |
| `npm run find-import`        | Locates where is the file imported   |
| `npm run check-missing-deps` | Locates where is the file imported   |

#### gen-env

This script scans your project’s JavaScript files and extracts all referenced `process.env.VAR_NAME` variables, generating a centralized list of required environment variables. It's perfect for env validation, deployment checks, or documentation purposes.

#### find-env

This script searches your project for exact occurrences of a specific environment variable, `such as process.env.DB_PASSWORD`, and outputs the file, line number, and matching line content.

#### find-import

This script scans your project to find all JavaScript/TypeScript files that import a specific file, such as index.js, utils.ts, or chatMessage.ts.

#### check-missing-deps

This script audits your project for missing and unused dependencies by scanning all import/require statements and comparing them against your `package.json`.

---

### Root

| Script               | Description                 |
| -------------------- | --------------------------- |
| `npm run zip:assets` | Start the production server |

#### zip:assets

This script locates all of the assets in the project, zips them into assets.zip file and saves them to `/server/app/routes/download`.

---

## API overview

| Method   | Endpoint            | Description             |
| -------- | ------------------- | ----------------------- |
| GET      | /playerCount        | Online player count     |
| GET      | /players            | Player stats            |
| POST     | /verify-token       | Register with token     |
| POST     | /apply, /wait-list  | Applications            |
| POST     | /upload-image       | Upload screenshot       |
| GET      | /user/validate, /me | User info               |
| POST     | /currency/login     | JWT for economy         |
| POST     | /currency/\*        | Balance ops             |
| GET/POST | /market/\*          | Token trading           |
| POST     | /admin/rcon         | Execute server commands |

Authentication via JWT and sessions for protected routes.

---

## Services & cron jobs

- **assignPlaytimeRoles.js**: Tier roles and Top Player
- **marketBoard.js**: Updates leaderboard embed
- **updateMemecoinPrices.js**: Random fluctuations, crashes
- **cronJobs.js**: Periodic snapshots, data cleaning, mob limits

---

## Market & crypto module

### Currency module

- Deposit, withdraw, transfer
- Transactions logged
- Auth via `/currency/login`

### Memecoin market

- Buy/sell with tax and cooldown
- Token prices fluctuate
- Crashes remove tokens below threshold
- Top investors get roles

---

## AI assistant

- Prompted as Createrington Market Bot
- OpenAI completion API
- Daily limit enforced
- Active only in Discord's AI chat channel

---

## Contributing

- Open issues or PRs
- Use ESLint, Prettier, and commit best practices
- Include tests (Jest)

---

## Related Projects

Here are some companion tools and related repositories that work well with or expand on the Createrington ecosystem:

- [**Createrington Currency**](https://github.com/matejhozlar/createrington-currency) – Minecraft Mod integrated with the website.
- [**Createrington Live Site**](https://create-rington.com) – Deployed version of the portal, connected to the live Minecraft server.

---

## Disclaimer

Not affiliated with Mojang, Microsoft, or Discord.

> The memecoin system is for entertainment only and has no real-world value.
