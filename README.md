# headbop

AI-powered music generator for teachers. Turn your lesson plans into catchy, memorable songs that help students learn.

## Getting Started

### Prerequisites

- Node.js 20+
- A [KIE AI](https://kie.ai) API key for music generation

### Setup

1. Install dependencies:

```bash
npm install
```

2. Configure your environment — edit `.env` and add your KIE API key:

```
DATABASE_URL="file:<absolute-path-to-project>/prisma/dev.db"
KIE_API_KEY="your-actual-api-key"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

3. Initialize the database:

```bash
npx prisma migrate dev
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
- **Database**: SQLite via Prisma
- **Music AI**: KIE AI (Suno API)

## Callback Setup

For production, set `NEXT_PUBLIC_BASE_URL` to your deployed URL so that KIE AI can send generation callbacks. For local development, use a tunnel service (e.g. ngrok) or the app will poll for status updates.
