# Round 03 — Frontend skeleton

> **Milestone:** M0
> **Effort:** M (30–45 min)
> **Prerequisites:** Round 02 complete
> **Blocks if:** nothing

## Goal

A runnable Vite + React + TypeScript app with Tailwind, showing a placeholder "Chinese Learning App" heading. No API calls yet.

## Files to create

- `frontend/package.json`, `frontend/package-lock.json`
- `frontend/tsconfig.json`, `frontend/tsconfig.node.json`
- `frontend/vite.config.ts`
- `frontend/tailwind.config.js`
- `frontend/postcss.config.js`
- `frontend/index.html`
- `frontend/.env.example`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `frontend/.gitignore` (Node-specific entries)

## Files to modify

- Replace `frontend/.gitkeep` with the structure above.

## Steps

1. From project root: `npm create vite@latest frontend -- --template react-ts`. Accept defaults.
2. Inside `frontend/`:
   - `npm install`.
   - `npm install -D tailwindcss@^3.4 postcss autoprefixer`.
   - `npx tailwindcss init -p` to generate `tailwind.config.js` + `postcss.config.js`.
   - `npm install axios @tanstack/react-query` (used in Round 10; install now to lock versions).
3. Configure `tailwind.config.js` `content` glob to `['./index.html', './src/**/*.{ts,tsx}']`.
4. Replace `src/index.css` contents with:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   html, body, #root { height: 100%; }
   body { @apply bg-slate-50 text-slate-900 font-sans antialiased; }
   ```
5. Replace `src/App.tsx` with a minimal placeholder:
   ```tsx
   export default function App() {
     return (
       <main className="min-h-screen flex items-center justify-center p-8">
         <div className="max-w-xl text-center space-y-2">
           <h1 className="text-3xl font-semibold">Chinese Learning App</h1>
           <p className="text-slate-600">Scaffold ready. Chat starts in Round 10.</p>
         </div>
       </main>
     );
   }
   ```
6. Configure `vite.config.ts` to proxy `/api` to the backend during dev:
   ```ts
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     server: {
       port: 5173,
       proxy: {
         '/api': 'http://localhost:8080',
       },
     },
   });
   ```
7. Create `.env.example` with `VITE_API_BASE_URL=http://localhost:8080/api`.
8. Create `Dockerfile` per `spec/08-docker-and-env.md` § "Frontend".
9. Create `nginx.conf` per `spec/08-docker-and-env.md` § "Frontend nginx.conf".
10. Make sure `frontend/.gitignore` contains: `node_modules`, `dist`, `.env`, `.vite`.

## References

- `spec/01-tech-stack.md` § Frontend
- `spec/06-frontend.md`
- `spec/08-docker-and-env.md` § Frontend Dockerfile + nginx.conf

## Verification

- [ ] `cd frontend && npm run dev` starts Vite on `http://localhost:5173` without errors.
- [ ] Browser shows the "Chinese Learning App" placeholder with Tailwind styling.
- [ ] `cd frontend && npm run build` succeeds and produces `dist/`.
- [ ] `docker build frontend -t chinese-app-frontend:dev` succeeds.

## When complete

1. Update Round 03 status.
2. Report: "Round 03 done. Next: Round 04 — TTS service skeleton."
3. **Stop.**
