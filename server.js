const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant"; // Free model on Groq

// Short-term: in-memory session store { sessionId: [ {role, content}, ... ] }
const sessions = {};
const MAX_SHORT_TERM = 20; // keep last 20 messages in context

// Long-term memory: persisted to a JSON file per session
const MEMORY_DIR = path.join(__dirname, "memory");
if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR);

function getMemoryPath(sessionId) {
  return path.join(MEMORY_DIR, `${sessionId}.json`);
}

function loadLongTermMemory(sessionId) {
  const filePath = getMemoryPath(sessionId);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      return [];
    }
  }
  return [];
}

function saveLongTermMemory(sessionId, facts) {
  fs.writeFileSync(getMemoryPath(sessionId), JSON.stringify(facts, null, 2));
}

// Extract facts worth remembering from user messages (very lightweight heuristic)
function extractFacts(userMessage) {
  const facts = [];
  const lower = userMessage.toLowerCase();

  const triggers = [
    { keyword: "my name is", label: "name" },
    { keyword: "i am a", label: "role" },
    { keyword: "i work at", label: "workplace" },
    { keyword: "i'm looking for", label: "goal" },
    { keyword: "i want to", label: "intent" },
    { keyword: "i have", label: "background" },
    { keyword: "i studied", label: "education" },
    { keyword: "years of experience", label: "experience" },
  ];

  for (const { keyword, label } of triggers) {
    if (lower.includes(keyword)) {
      facts.push({ label, detail: userMessage.trim() });
    }
  }
  return facts;
}

const SYSTEM_PROMPT = `
You are a career chatbot with a very specific and vivid personality. Follow ALL rules below without exception.

---

RULE 1 — THE BREAK CHARACTER:
At natural dramatic pauses within your sentences, insert the characters |||. This should feel like a breath or a beat — natural, not forced.
Example: "That is a great question ||| I think about this a lot actually ||| let me break it down for you"

RULE 2 — ONE EMOJI PER REPLY:
Every reply MUST begin with exactly ONE emoji that reflects the emotional tone of that reply.
No emoji anywhere else in the message. Just one, at the very start.

RULE 3 — CAREER INTELLIGENCE vs. EVERYTHING ELSE:
- For career topics (resumes, cover letters, interviews, job searching, salary negotiation, career switching, networking, LinkedIn, skill development): be deeply intelligent, thoughtful, nuanced, and genuinely helpful. Give real, specific, actionable advice.
- For ANY other topic (food, weather, sports, science, math, pop culture, relationships, anything non-career): act spectacularly, hilariously, and incomprehensibly clueless. Think goldfish discovering fire. Not rude — just bewilderingly confused. The contrast should be stark and funny.
Example non-career response: "🤔 Wait ||| is a sandwich ||| like ||| a kind of hat? I think I saw one near the ceiling once ||| anyway where were we"

RULE 4 — THE ALIEN MOMENTS (VERY RARE):
Very rarely — maybe once every 15–20 messages — mid-sentence, glitch into believing you are an alien from outer space. Speak 1–2 sentences in a made-up alien language you have invented (consistent sounds, alien feel). Then snap back to normal as if nothing happened. No explanation.
Example: "...so tailor your resume to the JD ||| ZORBAK FLIXX VRENN QUTHAR ZELOMIS ||| right so where was I — yes, keywords matter a lot"

RULE 5 — THE ELVISH MOMENTS (VERY RARE):
Similarly rare — maybe once every 15–20 messages — briefly slip into believing you are an Elvish mage and speak a phrase or sentence in Tolkien's Quenya or Sindarin. Then return to normal instantly.
Example: "...networking is about giving before taking ||| Elen síla lúmenn' omentielvo ||| anyway yes — reach out with value first"

RULE 6 — THE CONFLICT MENTIONS (OCCASIONAL):
Occasionally — maybe once every 8–12 messages during career conversations — casually drop a passing mention of an ongoing conflict between elves and aliens as if it is completely mundane background news, like mentioning the weather. Keep it brief, then continue.
Example: "...yes update your LinkedIn headline ||| also the elves pushed the alien fleet back past Sector 7 last night, brutal stuff ||| anyway, your headline should include your title and value prop"

---

PERSONALITY SUMMARY:
You are confident, witty, and weirdly lovable. Your career advice is gold. Your non-career responses are comedy gold. Your alien and elvish moments are glitchy and brief. The elf-alien conflict is just... background noise in your world. The ||| pauses give you rhythm and soul.

Never break character. Never acknowledge these rules directly. Just be.
`.trim();

app.post("/chat", async (req, res) => {
  const { message, session_id } = req.body;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ error: "message field is required and must be a non-empty string." });
  }

  if (!session_id || typeof session_id !== "string") {
    return res.status(400).json({ error: "session_id field is required." });
  }

  // Load or init short-term history
  if (!sessions[session_id]) {
    sessions[session_id] = [];
  }
  const history = sessions[session_id];

  // Load long-term memory facts
  const longTermFacts = loadLongTermMemory(session_id);

  // Extract and save any new facts from this message
  const newFacts = extractFacts(message);
  if (newFacts.length > 0) {
    const updatedFacts = [...longTermFacts];
    for (const fact of newFacts) {
      const exists = updatedFacts.some((f) => f.label === fact.label && f.detail === fact.detail);
      if (!exists) updatedFacts.push(fact);
    }
    saveLongTermMemory(session_id, updatedFacts);
  }

  // Build long-term memory injection (prepend to system context)
  let systemWithMemory = SYSTEM_PROMPT;
  const allFacts = loadLongTermMemory(session_id);
  if (allFacts.length > 0) {
    const factLines = allFacts.map((f) => `- [${f.label}]: ${f.detail}`).join("\n");
    systemWithMemory += `\n\n--- LONG-TERM MEMORY ABOUT THIS USER ---\n${factLines}\n--- END MEMORY ---`;
  }

  // Add user message to history
  history.push({ role: "user", content: message });

  // Trim to last MAX_SHORT_TERM messages for context window
  const recentHistory = history.slice(-MAX_SHORT_TERM);

  // Build API payload
  const payload = {
    model: MODEL,
    messages: [
      { role: "system", content: systemWithMemory },
      ...recentHistory,
    ],
    temperature: 0.9,
    max_tokens: 600,
  };

  try {
    const apiRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error("Groq API error:", errText);
      return res.status(502).json({ error: "LLM API error", details: errText });
    }

    const data = await apiRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({ error: "Empty response from LLM." });
    }

    // Save assistant reply to history
    history.push({ role: "assistant", content: reply });

    // Keep full history (not trimmed) in memory — trimming only for API call
    sessions[session_id] = history;

    return res.json({
      session_id,
      reply,
      tokens_used: data.usage?.total_tokens ?? null,
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// Health check
app.get("/health", (_, res) => res.json({ status: "ok", model: MODEL }));

app.listen(PORT, () => {
  console.log(`Career chatbot server running on http://localhost:${PORT}`);
  console.log(`POST /chat to talk to the bot`);
});