# Round 25 — Frontend auth (Google login, AuthProvider, login gate)

> **Milestone:** M5
> **Effort:** L (60–90 min)
> **Prerequisites:** Round 24 complete (backend fully auth-gated and user-scoped)
> **Blocks if:** `VITE_GOOGLE_CLIENT_ID` not set (same value as backend `GOOGLE_CLIENT_ID`).

## Goal

Gate the whole frontend behind Google sign-in. Add the Google login button, an auth context that stores the app JWT and rehydrates the user on reload, an axios interceptor that attaches the token, and a sign-out control. After this round, an unauthenticated visitor sees only the login screen; a signed-in user sees their own data across all tabs.

## Files to create

- `frontend/src/types/auth.ts` — `User`, `AuthResponse` mirroring backend DTOs.
- `frontend/src/lib/authStorage.ts` — `getToken/setToken/clearToken` over `localStorage` key `cl_app_token`.
- `frontend/src/auth/AuthProvider.tsx` — context with `{ user, token, login, logout }` per `spec/06-frontend.md` § Auth.
- `frontend/src/hooks/useAuth.ts` — consumes the context (throws outside the provider).
- `frontend/src/hooks/useGoogleLogin.ts` — `POST /api/auth/google` mutation; on success calls `auth.login`.
- `frontend/src/features/auth/LoginScreen.tsx` — centered card with `<GoogleLogin>`.

## Files to modify

- `frontend/package.json` — add `@react-oauth/google` (version per `spec/01-tech-stack.md`).
- `frontend/.env.example` — add `VITE_GOOGLE_CLIENT_ID` per `spec/06-frontend.md`.
- `frontend/src/lib/apiClient.ts` — add the request interceptor (attach `Bearer`) and 401 handling per `spec/06-frontend.md` § API client.
- `frontend/src/main.tsx` — wrap the tree in `<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>` and `<AuthProvider>`.
- `frontend/src/App.tsx` — if `!user` render `<LoginScreen/>`; else render the existing `Layout` + tabs. Add a header showing `user.displayName` + a "Sign out" button (`auth.logout`).

## Steps

1. Add `@react-oauth/google`; set `VITE_GOOGLE_CLIENT_ID` in `.env.example`.
2. Create `authStorage.ts` (the only module touching `localStorage` for auth).
3. Update `apiClient.ts`: request interceptor attaches the token; response interceptor clears the token on 401.
4. Create `AuthProvider`: on mount, if a token exists, call `GET /api/auth/me` to rehydrate `user`; on 401 clear and stay logged out. Expose `login(token, user)` and `logout()`.
5. Create `useAuth` and `useGoogleLogin`.
6. Create `LoginScreen` with `<GoogleLogin onSuccess={...}/>`; pass `credentialResponse.credential` to `useGoogleLogin`.
7. Wire providers in `main.tsx`; add the gate + header in `App.tsx`.

## References

- `spec/06-frontend.md` § Auth, § API client, top-level layout
- `spec/07-external-apis.md` §7.4 Google OAuth (frontend)

## Verification

- [ ] `npm run build` succeeds (TypeScript strict, no `any`).
- [ ] Visiting the app while logged out shows only `LoginScreen` — no tabs, no API calls firing (check the network tab).
- [ ] Signing in with Google lands on the chat tab; reloading the page keeps the user signed in (token rehydrated).
- [ ] "Sign out" returns to `LoginScreen` and clears `cl_app_token` from `localStorage`.
- [ ] Two different Google accounts see independent conversation/pronunciation histories.

## When complete

1. Update Round 25 status.
2. Report: "Round 25 done. Multi-user auth complete. Next: Round 21 — final cold-start verification & README polish."
3. **Stop.**
