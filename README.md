# NinnyControl

**NinnyControl** is a Discord moderation & utility bot with a built-in web dashboard.

It combines:

- Advanced moderation tools
- Auto-mod / anti-spam
- Reaction roles & tickets
- Leveling system
- Per-guild configuration
- A web panel with Discord login

> ⚠️ Use at your own risk.  
> You are responsible for complying with Discord’s Terms of Service and any applicable laws.  
> This software is provided **“as is”** with **no warranty** of any kind.

---

## ✨ Features

### 🛡️ Moderation

- `/warn` – Warn users and track total warnings per guild
- `/mute` – Mute/unmute using a configurable Muted role
- Logs:
  - Member joins/leaves
  - Message deletes/edits
  - Warnings / mutes
  - Spam detections
  - Ticket open/close events

### 🤖 Auto-Mod & Anti-Spam

Configurable per guild:

- Anti-spam:
  - Flood detection (X messages / Y seconds)
  - Optional auto timeout for spammers
- Link filter:
  - Block all links globally (toggle)
- Invite filter:
  - Block Discord invite links
- Blacklist words:
  - Delete messages containing certain words
  - Log violations

### 🎭 Tickets

- `/ticket` – Opens a private ticket channel for the user
- “Close Ticket” button
- Logs ticket closures to the log channel

### 🎨 Reaction Roles

- `/reactionrole` – Create a message where reacting assigns/removes a role
- Supports standard and custom emojis
- Roles auto-add on reaction add, auto-remove on reaction remove

### 🧬 Leveling System

- XP per message (with cooldown)
- Automatic level calculation
- Announces level-ups in chat
- `/rank` – Show a user’s level and XP
- `/leaderboard` – Top 10 users by level/XP in the guild

### ✅ Verification & Auto-Role

- `/verify` – Sends a verification button
- Click to receive a configured “Verified” role
- Optional auto-role on join (e.g., `@Member`)

### 🪵 Logging

All major events can be logged to a configured channel:

- Joins / leaves
- Message deletions and edits
- Warnings and mutes
- Auto-mod hits (spam, links, invites, blacklist)
- Ticket open/close

---

## 🌐 Web Dashboard

NinnyControl includes a Node/Express web dashboard.

### Overview Page

Available at:

```text
http://localhost:3000/
```

Shows:

- Bot tag and ID
- Number of servers
- Global stats:
  - Commands run
  - Warnings given
  - Mutes issued
  - Spam events
  - Messages seen
  - Tickets opened
- List of all guilds the bot is in (name, ID, member count)

### Discord OAuth2 Login

Users can log in with Discord to manage their servers:

- “Login with Discord” button
- After login:
  - Shows “Logged in as username#1234”
  - Lists only guilds where:
    - The user is admin / has `MANAGE_GUILD` perms **and**
    - The bot is in the guild

### Per-Guild Config Editor

From the dashboard, for each manageable guild you can:

- Toggle:
  - `Anti-Spam`
  - `Link Filter`
  - `Invite Filter`
- Edit messages:
  - Welcome message (`{user}`, `{server}` supported)
  - Goodbye message (`{user}`, `{server}` supported)
- Edit blacklist words:
  - Comma-separated list (e.g. `word1, word2, word3`)

Changes are saved server-side and applied live by the bot.

---

## 🧱 Tech Stack

- **Node.js**
- **discord.js v14**
- **Express** (web server + REST API)
- **express-session** (session handling)
- **node-fetch** (Discord OAuth2 calls)
- **File-based JSON storage** (config, warnings, levels, reaction roles)
- Plain **HTML/CSS/JS** for the dashboard frontend

---

## 📂 Project Structure

```text
NinnyControl/
  ├─ src/
  │   ├─ index.js          # Bot + web server + OAuth2 + API
  │   ├─ db.js             # JSON “DB” helper
  │   ├─ commands/         # Slash commands
  │   │   ├─ ping.js
  │   │   ├─ info.js
  │   │   ├─ warn.js
  │   │   ├─ mute.js
  │   │   ├─ config.js
  │   │   ├─ rank.js
  │   │   ├─ leaderboard.js
  │   │   ├─ reactionrole.js
  │   │   ├─ ticket.js
  │   │   └─ verify.js
  │   └─ web/              # Dashboard frontend
  │       ├─ index.html
  │       ├─ style.css
  │       └─ app.js
  ├─ data/                 # JSON data files (created at runtime)
  │   ├─ config.json
  │   ├─ warnings.json
  │   ├─ levels.json
  │   └─ reactionroles.json
  ├─ deploy-commands.js    # Slash command registration script
  ├─ package.json
  ├─ .env.example
  ├─ LICENSE
  └─ README.md
```

---

## ⚙️ Setup & Installation

### 1. Clone the Repo

```bash
git clone https://github.com/Ninnyyy/NinnyControl.git
cd NinnyControl
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Your `.env` File

Copy `.env.example` → `.env` and fill in your values:

```env
DISCORD_TOKEN=your-bot-token-here
DISCORD_CLIENT_ID=your-application-id-here
DISCORD_CLIENT_SECRET=your-oauth-client-secret-here
DISCORD_GUILD_ID=optional-test-guild-id
PORT=3000

# Base URL where your dashboard is reachable
DASHBOARD_BASE_URL=http://localhost:3000

# Any long random string
SESSION_SECRET=super-secret-session-key-change-me
```

#### Discord OAuth2 Setup

In your Discord Developer Portal:

1. Go to your application → **OAuth2 → General**
2. Add a redirect URL:
   - `http://localhost:3000/auth/discord/callback`
3. Copy:
   - **Client ID** → `DISCORD_CLIENT_ID`
   - **Client Secret** → `DISCORD_CLIENT_SECRET`
4. In **Bot** tab:
   - Create a bot, copy the **bot token** → `DISCORD_TOKEN`
   - Give it the necessary intents (Guilds, Members, Messages, Message Content, etc.)

---

## 🔁 Register Slash Commands

Before running the bot, deploy the slash commands:

```bash
npm run deploy-commands
```

- If `DISCORD_GUILD_ID` is set, commands will register **per-guild** (fast, good for development).
- If not set, commands register **globally** (can take a while to appear).

---

## 🚀 Running the Bot + Dashboard

Start NinnyControl:

```bash
npm start
```

- The bot logs in to Discord.
- The web dashboard starts on `http://localhost:3000`.

Open:

```text
http://localhost:3000/
```

You’ll see:

- Live overview
- Bot guild list
- “Login with Discord” button

Log in to access the guild config editor.

---

## 🧪 Commands Overview

| Command          | Description                                      | Notes                                         |
|------------------|--------------------------------------------------|-----------------------------------------------|
| `/ping`          | Check latency / if the bot is alive              |                                               |
| `/info`          | Bot stats & basic info                           |                                               |
| `/warn`          | Warn a user and track total warnings             | Logs + optional DM to user                    |
| `/mute`          | Mute/unmute a user via Muted role                | Requires mod permissions                      |
| `/config`        | View / set server settings                       | Log channel, welcome/goodbye, filters, etc.   |
| `/verify`        | Send a “Click to verify” button                  | Uses configured verify role                   |
| `/rank`          | Show XP and level for a user                     | Leveling system                               |
| `/leaderboard`   | Show top 10 users by level                       | Per-guild leaderboard                         |
| `/reactionrole`  | Create a reaction role message                   | Assign/remove role on reaction add/remove     |
| `/ticket`        | Open a private ticket channel                    | Includes close button                         |

---

## 🧠 Data Storage

This project uses simple **JSON files** for persistence:

- `data/config.json`
  - Per-guild config (log channels, auto-mod toggles, messages, roles)
- `data/warnings.json`
  - Per-user warning counts per guild
- `data/levels.json`
  - Per-user XP and level per guild
- `data/reactionroles.json`
  - Reaction role definitions per guild

This is great for local use and testing.  
If you want to scale in production, you can swap this for a proper DB (SQLite/Postgres/Mongo) using the same shapes.

---

## ✅ Quick Test Checklist

Before you ship or invite others:

1. **Bot online**
   - `npm start` shows “Logged in as …”
   - `/ping` works in at least one server

2. **Basic moderation**
   - `/warn @user` → warning count increments and logs in the log channel
   - `/mute @user true` / `/mute @user false` → role is added/removed

3. **Auto-mod**
   - Enable anti-spam via `/config` or dashboard
   - Spam a channel → bot warns/timeouts + logs it
   - Enable invite filter, send a Discord invite → message deleted + log
   - Set blacklist words, send one → message deleted + log

4. **Leveling**
   - Send normal messages → `/rank` shows XP/level
   - `/leaderboard` lists top users

5. **Tickets**
   - `/ticket` → new channel created
   - Use “Close Ticket” button → channel deleted + log

6. **Reaction roles**
   - `/reactionrole` → bot sends a message and reacts
   - React / unreact → role gets added / removed

7. **Dashboard + OAuth**
   - Open `http://localhost:3000/`
   - Click “Login with Discord”
   - After login, see:
     - Your Discord tag
     - Guilds you can manage where the bot is present
   - Pick a guild in “Manage Guild Config”
   - Toggle a setting (e.g. Anti-Spam) and save
   - Confirm behavior matches in Discord

If all of that works, you’re good to push this to GitHub and call it a release.

---

## ⚖️ License

This project is licensed under the **MIT License**.  
See [`LICENSE`](./LICENSE) for full details.

> Use at your own risk. The authors and contributors are **not liable** for any damages, moderation mistakes, or Discord account/server issues resulting from use or misuse of this software.
