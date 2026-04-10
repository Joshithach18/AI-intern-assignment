# Career Chatbot 🤖

A personality-driven career advice chatbot built with Node.js and Express. It is deeply intelligent about careers, hilariously clueless about everything else, with occasional alien glitches, Elvish slip-ups, and casual mentions of an ongoing elf-alien war.

---

## Free LLM Used: Groq + LLaMA 3.1 8B Instant

This project uses **[Groq](https://console.groq.com)** as the LLM provider, running the **`llama-3.1-8b-instant`** model.

| | |
|---|---|
| 💰 Cost | Completely free (no credit card required) |
| ⚡ Speed | ~560 tokens/second |
| 🪟 Context | 131,072 token context window |
| 🔗 API | OpenAI-compatible |

**Get your free API key:**
1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to **API Keys** → **Create API Key**
4. Copy the key — you will paste it into your `.env` file

---

## Installation & Setup

### Prerequisites
- Node.js **v18 or higher** — check with `node --version`
- A free Groq API key (see above)

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd career-chatbot

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
```

Open the `.env` file and replace the placeholder with your actual Groq API key:

```
GROQ_API_KEY=gsk_your_actual_key_here
PORT=3000
```

```bash
# 4. Start the server
npm start
```

You should see:
```
Career chatbot server running on http://localhost:3000
POST /chat to talk to the bot
```

For development with auto-reload on file changes:
```bash
npm run dev
```

---

## API Reference

### `POST /chat`

The only endpoint. Sends a message and receives a personality-driven reply.

**URL:** `http://localhost:3000/chat`

**Request Body (JSON):**

```json
{
  "message": "How do I write a great resume?",
  "session_id": "user_abc_123"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | ✅ Yes | The user's message to the chatbot |
| `session_id` | string | ✅ Yes | A unique ID for the conversation. Use the same value across messages to maintain memory. |

**Successful Response (200):**

```json
{
  "session_id": "user_abc_123",
  "reply": "💼 Great question ||| your resume should be a highlight reel, not a job description ||| tailor it to the role, lead with impact, and cut anything older than 10 years unless it's exceptional",
  "tokens_used": 312
}
```

**Error Responses:**

| Status | Cause |
|---|---|
| `400` | Missing or empty `message` or `session_id` field |
| `502` | Groq API returned an error (e.g. invalid key) |
| `500` | Internal server error |

---

### `GET /health`

Quick check to confirm the server is running.

```json
{ "status": "ok", "model": "llama-3.1-8b-instant" }
```

---

## Testing with Postman

### Setup

1. Open **Postman**
2. Click **New Request**
3. Set method to **POST**
4. Enter URL: `http://localhost:3000/chat`
   > ⚠️ Make sure there is no trailing space after `chat` in the URL
5. Click **Body** tab → select **raw** → change format to **JSON**

### Basic Test

Paste this and click **Send**:

```json
{
  "message": "Can you help me prepare for a software engineering interview?",
  "session_id": "test-session-1"
}
```

You should get a smart, detailed response about interview preparation with `|||` pauses and a leading emoji.

---

### Personality Tests

Use `"session_id": "test1"` for all of these and send them in order.

**Career topics — expect deep, expert advice:**

```json
{ "message": "How do I switch careers from software engineering to product management?", "session_id": "test1" }
```
```json
{ "message": "What should my resume summary section say?", "session_id": "test1" }
```
```json
{ "message": "How do I negotiate a higher salary without losing the offer?", "session_id": "test1" }
```
```json
{ "message": "How do I network on LinkedIn without seeming desperate?", "session_id": "test1" }
```
```json
{ "message": "I have a technical interview at Google next week, how do I prepare?", "session_id": "test1" }
```

**Non-career topics — expect goldfish-level confusion:**

```json
{ "message": "What is the capital of France?", "session_id": "test1" }
```
```json
{ "message": "Can you recommend a good pasta recipe?", "session_id": "test1" }
```
```json
{ "message": "What is 15 multiplied by 6?", "session_id": "test1" }
```
```json
{ "message": "Who won the FIFA World Cup?", "session_id": "test1" }
```

**To trigger alien / elvish / conflict moments:**

Keep sending career messages. Rare personality moments are probabilistic:
- **Elf-alien conflict mention** — roughly every 8–12 messages
- **Alien glitch** — roughly every 15–20 messages
- **Elvish moment** — roughly every 15–20 messages

```json
{ "message": "Tell me about the STAR method for interviews", "session_id": "test1" }
```
```json
{ "message": "How do I write a cold email to a recruiter?", "session_id": "test1" }
```
```json
{ "message": "What skills should a data analyst have on their resume?", "session_id": "test1" }
```
```json
{ "message": "Should I apply to startups or big companies first?", "session_id": "test1" }
```
```json
{ "message": "How do I handle a gap in my employment history?", "session_id": "test1" }
```

---

### Memory Tests

#### Base Memory (Short-Term)

Send these in order with the same `session_id`:

```json
{ "message": "My favourite programming language is Python", "session_id": "memtest" }
```
```json
{ "message": "I have 3 years of experience in backend development", "session_id": "memtest" }
```
```json
{ "message": "What language did I just say I like?", "session_id": "memtest" }
```
```json
{ "message": "How many years of experience do I have?", "session_id": "memtest" }
```

The bot should correctly recall both facts, proving short-term conversational context is working.

#### Long-Term Memory (Across Server Restarts)

**Step 1** — Tell the bot something about yourself:
```json
{ "message": "My name is Arjun and I work at Infosys as a backend developer", "session_id": "memtest" }
```

**Step 2** — Stop the server with `Ctrl+C`, then restart it with `npm start`

**Step 3** — Use the exact same `session_id` and ask:
```json
{ "message": "Do you remember who I am?", "session_id": "memtest" }
```

The bot should still know your name and company because those facts were saved to `memory/memtest.json` on disk before the restart. You can open that file directly to inspect what was stored:

```json
[
  { "label": "name", "detail": "My name is Arjun and I work at Infosys as a backend developer" },
  { "label": "workplace", "detail": "My name is Arjun and I work at Infosys as a backend developer" }
]
```

#### Session Isolation Test

```json
{ "message": "My name is Arjun", "session_id": "user-a" }
```
```json
{ "message": "What is my name?", "session_id": "user-b" }
```

`user-b` should have no idea — proving memory is properly scoped per session and does not bleed across users.

---

## System Prompt Design

The system prompt is structured as **6 explicit numbered rules**, each dedicated to one personality trait. This approach was intentional: giving the model one clear rule per behaviour rather than a single block of prose makes it significantly more consistent at following each trait independently.

**Rule 1 — The `|||` Break Character**
Defined as a "dramatic breath or beat" and shown with an inline example. Framing it as a natural pause rather than a formatting instruction helps the model place it where it actually sounds right, not at random intervals.

**Rule 2 — One Emoji Per Reply**
Strictly constrained to the very first character of every reply, and tied to emotional tone. The constraint prevents emoji from appearing mid-message, which the assignment disallows.

**Rule 3 — Career Intelligence vs. Everything Else**
The core duality of the bot. Career topics unlock a thoughtful, expert persona. Everything else triggers "goldfish discovering fire" confusion — the specific metaphor was chosen deliberately to push the model toward committed absurdity rather than mild hedging, which is what happens without it.

**Rule 4 — Alien Moments**
Described as a rare "glitch" that the bot snaps out of instantly with no acknowledgment. The glitch framing is what makes it feel like a malfunction rather than a deliberate bit, which is the tonal target.

**Rule 5 — Elvish Moments**
Same rarity and recovery pattern as the alien moments, but using real Tolkien Quenya/Sindarin vocabulary (e.g. *Elen síla lúmenn' omentielvo*) for authenticity.

**Rule 6 — Elf-Alien Conflict Mentions**
Instructed to treat this as mundane background news, comparable to mentioning the weather. The analogy is in the prompt itself, and a full example sentence is provided. Without both, the model tends to play it up dramatically instead of dropping it casually mid-sentence.

The prompt closes with a short **personality summary** paragraph. This gives the model an identity to inhabit rather than a checklist to execute, which meaningfully improves naturalness across all six traits.

---

## Memory Architecture

### Short-Term Memory (Base Requirement ✅)

Every `session_id` gets its own message array stored in the server's in-memory object. On each request, the last **20 messages** from that array are sent to the LLM as conversation history, giving the model full context of the recent exchange.

The full history is retained in memory for the lifetime of the server process — only the 20-message window is passed to the API call to stay within token limits.

### Long-Term Memory (Bonus ✅)

Long-term memory is implemented as **per-session JSON files** stored in a `memory/` directory that is created automatically on first run and excluded from git via `.gitignore`.

**How it works:**

1. When a user sends a message, a lightweight keyword scanner checks for fact-bearing phrases:

| Trigger phrase | Label stored |
|---|---|
| `"my name is"` | `name` |
| `"i work at"` | `workplace` |
| `"i'm looking for"` | `goal` |
| `"i want to"` | `intent` |
| `"i have"` | `background` |
| `"i studied"` | `education` |
| `"years of experience"` | `experience` |

2. Matched facts are appended to `memory/<session_id>.json` with deduplication — the same fact is never written twice.

3. On every subsequent request from that session, the stored facts are injected into the system prompt under a clearly labelled `--- LONG-TERM MEMORY ABOUT THIS USER ---` block, so the model always has access to what it knows about the person.

**Why this approach:**
It is zero-dependency (plain `fs` reads/writes), survives server restarts, and is fast — no database, no embedding model, no external service required. The trade-off is that it only captures explicitly stated facts rather than inferring them from context. A more sophisticated version could use a second LLM call to summarise and extract facts from every message, but that would add latency on every request.

---

## Project Structure

```
career-chatbot/
├── server.js         # Main Express server — all routes, memory logic, and LLM calls
├── package.json      # Dependencies and npm scripts
├── .env.example      # Environment variable template (safe to commit)
├── .env              # Your actual API key — never commit this
├── .gitignore        # Excludes .env, node_modules/, memory/
├── README.md         # This file
└── memory/           # Auto-created on first run; one JSON file per session_id
```

---

## Assignment Compliance Checklist

| Requirement | Status |
|---|---|
| Node.js HTTP server using Express | ✅ |
| Single `POST /chat` endpoint | ✅ |
| No frontend built | ✅ |
| Free LLM API — Groq + LLaMA 3.1 8B Instant | ✅ |
| API key loaded from `.env`, never hardcoded | ✅ |
| `.env.example` file provided | ✅ |
| `|||` break character in all replies | ✅ |
| One emoji per reply, leading, tone-matched | ✅ |
| Career intelligence / non-career absurdity | ✅ |
| Alien glitch moments (rare) | ✅ |
| Elvish mage moments (rare) | ✅ |
| Elf-alien conflict mentions (occasional) | ✅ |
| Short-term memory — last 20 messages per session | ✅ |
| Long-term memory — JSON file persistence with fact extraction | ✅ |
| README with all required sections | ✅ |
