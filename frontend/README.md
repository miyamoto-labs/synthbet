# EasyPoly Frontend

Next.js 15 web application for EasyPoly.

## Structure

```
frontend/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   ├── lib/              # Utilities, API clients
│   └── styles/           # Global styles
├── public/               # Static assets
└── package.json
```

## Development

```bash
npm install
npm run dev
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SYNTHDATA_API_KEY=your_key_here
```

## Tech Stack

- Next.js 15
- React
- TypeScript
- TailwindCSS
- shadcn/ui
- Recharts (for graphs)
