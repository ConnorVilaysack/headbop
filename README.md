# headbop

AI-powered music generator for teachers. Turn your lesson plans into catchy, memorable songs that help students learn.

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project (Auth + Postgres)
- A [KIE AI](https://kie.ai) API key for music generation

### Setup

1. Install dependencies:

```bash
npm install
```

2. Configure your environment — copy `.env.example` to `.env` and fill in Supabase + KIE values:

```
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
KIE_API_KEY="..."
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

3. Initialize the Supabase table:

```bash
# In Supabase Dashboard -> SQL Editor, run:
# supabase/setup.sql
```

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## How It Works

1. **Create** — Enter your lesson's key points, pick a subject and music style
2. **Generate** — AI creates a catchy educational song using KIE AI (Suno)
3. **Save** — Songs are automatically saved to your library for reuse
4. **Library** — Browse, play, search, and manage your song collection

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase Postgres
- **Auth**: Supabase Auth (email/password)
- **Music AI**: KIE AI (Suno API)

## Callback Setup

For production, set `NEXT_PUBLIC_BASE_URL` to your deployed URL so that KIE AI can send generation callbacks. For local development, use a tunnel service (e.g. ngrok) or the app will poll for status updates.
