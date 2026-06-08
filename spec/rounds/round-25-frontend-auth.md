# Round 25 — Frontend auth (Google login, AuthProvider, login gate)

> **Milestone:** M5
> **Effort:** S–M (30–45 min)
> **Prerequisites:** Round 24 complete (backend fully auth-gated and user-scoped)
> **Blocks if:** `VITE_GOOGLE_CLIENT_ID` not set (same value as backend `GOOGLE_CLIENT_ID`).

## Goal

Gate the whole frontend behind Google sign-in with a **real** Google ID token (not the mock's `'mock-google-id-token'` stub). After this round, an unauthenticated visitor sees only the login screen; a signed-in user sees their own data across all tabs, and reload keeps them signed in.

The auth scaffolding — context, storage, hooks, interceptors, and the login screen's layout/copy — is **already built and running against mock data** (see `spec/06-frontend.md` § Pre-built frontend & the mock seam). The mock currently accepts any string as an "ID token" and always returns `MOCK_USER`. This round's real work is narrower than the original scope: swap the login screen's trigger for the genuine Google identity widget (the backend's `GoogleIdTokenVerifier` requires a real signed JWT, which only Google's own button/One Tap UI can produce — see `spec/07-external-apis.md` §7.4), then retire the auth mock handlers.

## Already built (do not recreate)

- `frontend/src/types/auth.ts` — `User`, `AuthResponse`.
- `frontend/src/lib/authStorage.ts` — `getToken/setToken/clearToken` over `localStorage` key `cl_app_token`.
- `frontend/src/auth/AuthProvider.tsx` — `AuthState { user, token, login, logout }`; rehydrates via `GET /auth/me` on mount; clears on 401.
- `frontend/src/hooks/useAuth.ts` — context consumer (throws outside the provider).
- `frontend/src/hooks/useGoogleLogin.ts` — `useMutation` wrapping `POST /auth/google` with `{ idToken }`; on success calls `auth.login(token, user)`.
- `frontend/src/lib/apiClient.ts` — request interceptor attaches `Bearer`, response interceptor clears the token on 401.
- `frontend/src/main.tsx` — already wraps the tree in `<QueryClientProvider><AuthProvider><App /></AuthProvider></QueryClientProvider>`.
- `frontend/src/App.tsx` — already gates on `useAuth().user`: renders `<LoginScreen/>` when signed out, `<Layout>` + tabs (with header, user chip, Sign out) when signed in.
- `frontend/src/features/auth/LoginScreen.tsx` — the centered card, brand mark, copy, and error state are final. **Only its sign-in trigger changes** (see Steps).

## Files to create

(none)

## Files to modify

- `frontend/package.json` — add `@react-oauth/google` (version per `spec/01-tech-stack.md`).
- `frontend/.env.example` — add `VITE_GOOGLE_CLIENT_ID` per `spec/06-frontend.md`.
- `frontend/src/main.tsx` — wrap the tree in `<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>`.
- `frontend/src/features/auth/LoginScreen.tsx` — replace the mock `onClick={signIn}` button with `<GoogleLogin onSuccess={...} />`.
- `frontend/src/mocks/server.ts` — delete the auth mock handlers.
- `frontend/src/mocks/data.ts` — delete fixtures that become unused once those handlers are gone.

## Steps

1. Add `@react-oauth/google`; set `VITE_GOOGLE_CLIENT_ID` in `.env.example` (same value as backend `GOOGLE_CLIENT_ID`, per `spec/07-external-apis.md` §7.4 setup).
2. In `main.tsx`, wrap the existing provider tree in `<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>` (outermost, above `QueryClientProvider`).
3. In `LoginScreen.tsx`:
   - Keep the card, brand mark, copy, and error-state styling exactly as-is.
   - Replace the custom `<button onClick={signIn}>…</button>` with `<GoogleLogin onSuccess={(credentialResponse) => googleLogin.mutate(credentialResponse.credential, { onError: () => setError(...) })} onError={() => setError(...)} />`. `credentialResponse.credential` is the Google **ID token** (a signed JWT) — pass it straight through to the existing `useGoogleLogin` mutation, which already POSTs `{ idToken }` to `/api/auth/google`.
   - `<GoogleLogin>` renders Google's own button chrome; if you want it to visually match the existing card, wrap it in a container sized like the old button and use the library's `theme`/`shape`/`width` props rather than re-styling the inside (Google's terms require the official rendering).
4. In `frontend/src/mocks/server.ts`, remove `mock.onPost('/auth/google')` and `mock.onGet('/auth/me')`. In `frontend/src/mocks/data.ts`, remove `MOCK_USER`/`MOCK_TOKEN` if nothing else references them.
5. Restart the dev server (env vars are read at build time) and sign in with a real Google account.

## References

- `spec/06-frontend.md` § Auth, § API client, § Pre-built frontend & the mock seam, top-level layout
- `spec/07-external-apis.md` §7.4 Google OAuth (frontend) — note it specifically requires `credentialResponse.credential` (an ID token), which the rendered `<GoogleLogin>` button provides; the library's programmatic `useGoogleLogin({ flow: 'implicit' })` hook returns an OAuth *access* token instead and will **not** verify against the backend's `GoogleIdTokenVerifier`.

## Verification

- [ ] `npm run build` succeeds (TypeScript strict, no `any`).
- [ ] Visiting the app while logged out shows only `LoginScreen` with the real Google button — no tabs, no API calls firing (check the network tab).
- [ ] Signing in with a real Google account lands on the chat tab; reloading the page keeps the user signed in (token rehydrated via the real `GET /api/auth/me`).
- [ ] "Sign out" returns to `LoginScreen` and clears `cl_app_token` from `localStorage`.
- [ ] Two different Google accounts see independent conversation/pronunciation histories.
- [ ] DevTools → Network: `/auth/google` and `/auth/me` now hit the real backend (no 500 ms mock delay; `onNoMatch: 'passthrough'` carried them through automatically once the handlers were removed).

## When complete

1. Update Round 25 status.
2. Report: "Round 25 done. Multi-user auth complete. Next: Round 21 — final cold-start verification & README polish."
3. **Stop.**
