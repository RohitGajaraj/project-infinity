# Brainstorm: a consumer agent that stands out from Instinct and Muse

## 1. How I read the space (unverified; I'll check it before we commit)
- **Instinct-style agents** handle errands: booking, buying, sending messages. They act for you.
- **Meta Muse-style assistants** are general helpers built into apps people already use.
- **Where both are weak:** they generate and act, but nobody checks them. When an agent books the wrong flight, pays the wrong bill, or cites a number it made up, the user finds out too late. The more errands agents run, the worse this gets.
- Your own DIRECTION.md (written 2026-09-24) already settled on this gap: **independent verification of work an AI produced**. It scored that idea against 8 tests and it was the only one that passed. I've built the ideas below on top of that choice instead of starting over.

## 2. Five candidate ideas
| # | Idea | Pain it solves | Who pays | Risk |
|---|---|---|---|---|
| A | **Agent Receipts**: check every errand an agent finishes (booking, purchase, form, email) against what the user asked for, and flag anything that doesn't match before it goes through | Agents are wrong 5–20% of the time on multi-step errands, and it costs real money | Consumers ($10/mo), and agent companies (per check) | Needs hooks into other agents |
| B | **Number Check** (the DIRECTION.md wedge): drop in a document plus its sources, and see which numbers are backed up, which aren't, and which contradict the source, with a link you can share | AI-written decks, memos and reports ship with wrong numbers | Consultants, agencies, analysts ($20–50/mo) | People may accept "good enough" |
| C | **Mandate Wallet**: set limits an agent can't go past ("spend up to $200, only these stores, ask me first for anything over $50") | People won't hand agents their money without limits | Consumers, and it's licensable to agent apps | Payment and banking adjacency, which DIRECTION.md rules out (T8) |
| D | **Agent-to-agent referee**: a neutral judge that settles disputes when two agents negotiate or trade | Agent commerce needs someone both sides trust | Marketplaces | Too early; no quick way to test it |
| E | **Life-admin inbox**: one agent that reads your bills, renewals and deadlines and quietly fixes them | Busy people miss payments and pay for subscriptions they forgot | Consumers | Crowded; this is what Instinct and Muse already do |

## 3. My recommendation
**Start with B and design it so it grows into A.**
- B can be tested by strangers in 14 days with no partnerships (DIRECTION.md §5).
- The engine underneath (pull out claims, compare them to the source, give a verdict, share a link) is the same engine A needs later.
- **What sets us apart:** Instinct and Muse do the work. We check it. We're the independent referee, not another helper, so better AI makes us more useful instead of replacing us.
- **How it spreads:** every result comes with a link the recipient opens, so each use shows the product to a second person.

## 4. First build (only after you approve this direction)
1. **Home page:** one line saying what it does, an area to drop a document and its sources, and the three hand-made example reports.
2. **Check flow:** upload the document and sources, pull out every number, match each one to the exact line in the source, and mark it verified, unsupported or contradicted.
3. **Result page:** each number highlighted with its verdict and the source quote next to it.
4. **Public share link:** a read-only result page anyone can open, with a "Check your own document" button.
5. **Simple counts** that match the DIRECTION.md kill/continue table: checks run, share links opened, repeat uses.

Not in the first build: accounts with tiers, team workspaces, payments (a payment link only), or claim types other than numbers.

## 5. Technical details
- TanStack Start routes: `/` (upload), `/check/$id` (result), `/r/$shareId` (public view).
- Storage uses **your own Supabase project** (you asked for this instead of Lovable Cloud). You connect it in Project Settings → Connectors → Supabase before we build step 2. Tables: `checks`, `claims`, `share_views`, with row-level security.
- AI through Lovable AI Gateway: one server function to pull out numbers and a second model call to judge each match, with every call logged.
- PDF/DOCX text extraction runs in the browser, so the server side stays simple.

## Open question
DIRECTION.md §7 says not to add a fourth document until there are 25 users. Once approved, I'll add this brainstorm as a new section of DIRECTION.md rather than creating a new file.
