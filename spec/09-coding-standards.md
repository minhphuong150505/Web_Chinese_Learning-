# 09 — Coding Standards

> Read `/home/phuong/Documents/Web_Chinese_Learning/Claude.md` first. The points below are project-specific additions, not replacements.

## Mental model

Every line of code MUST trace to a step in an active round. If you can't point to which step required this line, delete it.

## General

- **No speculative abstractions.** Don't add an interface unless this spec already lists a second implementation.
- **No "for future use" code.** YAGNI.
- **Each round touches only files listed in its round file.** If you need to touch something else, stop and ask.
- **Match existing style** even if you'd do it differently (Claude.md §3).
- **Prefer composition over inheritance.** Java services hold collaborators; never `extends OtherService`.

## Java

- Java 21. Use **records** for DTOs and value objects.
- `var` only when the type is obvious from the right side.
- No checked exceptions in service signatures. Wrap in `ApiException` or other runtime exceptions.
- Logging: SLF4J via `LoggerFactory.getLogger(MyClass.class)`. **No `System.out`**.
- Null safety: prefer `Optional<T>` for repository returns. Otherwise document non-nullness in javadoc.
- Format: 4-space indent. No enforced formatter; just be consistent.
- Tests: JUnit 5. One assertion focus per test. Naming: `methodName_givenCondition_thenExpected`.
- **No Lombok.** Write explicit getters.

## TypeScript / React

- `strict: true`, `noUncheckedIndexedAccess: true`.
- **Functional components only.** No class components.
- Hooks named `useXxx`. One non-trivial hook per file.
- Props typed via inline `type` or `interface` above the component.
- **No `any`.** Use `unknown` and narrow.
- File naming: `PascalCase.tsx` for components, `camelCase.ts` for hooks/utils.
- Import order: stdlib / 3rd-party → absolute (`@/`) → relative (`./`).

## Commit messages (if working in git)

Format: `R<round#>: <short imperative>`.
Examples:
- `R2: scaffold Spring Boot backend with HealthController`
- `R9: add ConversationController endpoints`

## What MUST NOT be done

- DO NOT hardcode API keys anywhere (source, tests, fixtures).
- DO NOT inline JSON parsing of LLM responses inside controllers.
- DO NOT call `Thread.sleep` in production code.
- DO NOT introduce dependencies not listed in `01-tech-stack.md` without user approval.
- DO NOT add features outside the active round's scope.
- DO NOT refactor unrelated code (Claude.md §3).
- DO NOT amend a previously merged migration. Always add `V<n+1>__*.sql`.
- DO NOT delete `Claude.md`, `PROMPT_CLAUDE_CODE.md`, or files under `spec/`.

## Stop-and-ask triggers

The implementer MUST stop and ask the user when:

1. A required env var is missing (`LLM_API_KEY` for Round 7+; `AZURE_SPEECH_KEY` for Round 16+).
2. A model name in DeepSeek docs differs from `.env.example` defaults.
3. A verification step fails in a way that isn't a simple code fix.
4. A change would require touching a file outside the active round's "files touched" list.
5. Any decision in `00-overview-and-decisions.md` would need to be revisited.
6. A new dependency would need to be added.

## End-of-round protocol

When a round's verification checklist is all green:

1. Update the status in `spec/rounds/README.md` (change `[ ]` to `[x]` for that round).
2. Report to the user: "Round NN done. Verified: <list>. Next round: NN+1 (<title>)."
3. **Stop.** Do not start the next round without user approval.
