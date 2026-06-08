# 11 — Sample Content (HSK 2–3)

> Source: validated in the Claude Design prototype (`design brief → chat1.md → src/data.jsx`). Use this content wherever the spec or a round needs a concrete Chinese sentence — placeholder UI text, hardcoded reference sentences, demo/seed data, or test fixtures. It replaces ad-hoc placeholders like `你好，今天天气怎么样？` so the whole app reads as one cohesive scenario instead of disconnected examples.

## Why this exists

Earlier round drafts used unrelated one-off sentences for different features (a weather greeting for Pronounce, generic phrases for Translate/Write). The design prototype settled on a **single connected theme** — ordering food at a small restaurant + everyday routines — at **HSK 2–3** level (simple, learner-appropriate, real-world useful). Reusing it keeps the demo coherent: the sentence you practice pronouncing is the same kind of thing you'd say in the chat scenario.

## Pinyin + tone notation (for anyone authoring more sample content)

The prototype encodes each syllable as `汉|pīnyīn|tone` (tone `0` = neutral/no tone, used for punctuation tokens too, e.g. `，||0`). This is purely a content-authoring convenience — it is **not** a wire format the backend needs to produce. The backend returns plain `String` text (see `spec/05-backend.md` DTOs); the frontend is free to render pinyin/tone coloring however `spec/06-frontend.md` specifies. Keep the notation in mind only if writing new sample sentences for fixtures or seed data.

## 11.1 Chat scenario — "Ordering food at a small Chinese restaurant"

AI role: a friendly restaurant host/server (matches `ConversationService.SYSTEM_PROMPT` in `spec/07-external-apis.md` — friendly partner, short replies, gentle correction, ends with a question).

**Opening line (AI greeting):**
- 你好！欢迎光临，想吃点什么？
- *Nǐ hǎo! Huānyíng guānglín, xiǎng chī diǎn shénme?*
- "Hello! Welcome — what would you like to eat?"

**Example turn-by-turn flow** (illustrative — the real backend calls DeepSeek live; these are the kind of exchanges to expect/seed in fixtures or manual test scripts):

| Learner says | AI replies | Notes |
|---|---|---|
| 我要包子两个 *(slightly off word order)* | 好的！我们有包子、面条和炒饭。你想喝点什么？ ("Great! We have buns, noodles, and fried rice. What would you like to drink?") | AI gently corrects: "Put the number + measure word (两个) before the noun: 我想要两个包子" |
| 一杯热茶，谢谢。 | 没问题。一杯热茶，对吗？ ("No problem. One cup of hot tea, correct?") | — |
| 对。 | 好的，一共十五块钱。请稍等。 ("Okay, fifteen yuan in total. One moment please.") | — |
| (continuing) | 你的中文说得很好！还想点别的吗？ ("Your Chinese is very good! Would you like to order anything else?") | Loops back to keep the conversation going |

**Suggestion chips** (quick-reply starters a learner could tap instead of typing):
- 我想要两个包子。 — "I'd like two buns."
- 有什么推荐？ — "Any recommendations?"
- 一杯热茶，谢谢。 — "One cup of hot tea, please."

## 11.2 Pronounce — reference sentence

Use this as the (initially hardcoded) `referenceText` in `PronunciationTab` (Round 14/18), replacing the earlier placeholder `你好，今天天气怎么样？`:

> **我想买一杯热茶和两个包子。**
> *Wǒ xiǎng mǎi yì bēi rè chá hé liǎng gè bāozi.*
> "I want to buy a cup of hot tea and two buns."

It deliberately echoes the chat scenario (tea + buns) so a learner who just practiced ordering can immediately practice *saying* the order aloud. 12 scoring syllables (excluding punctuation) — enough for a meaningful per-syllable grid in `ScorePanel` without overwhelming it.

## 11.3 Translate — sample pairs

For manual verification / demo screenshots (the feature itself is stateless, live-translated by DeepSeek):

**Vietnamese → Chinese**
- Input: *Tôi muốn một cốc trà nóng và hai cái bánh bao.*
- Expected-shape output: 我想要一杯热茶和两个包子。 ("I'd like a cup of hot tea and two buns.")

**Chinese → Vietnamese**
- Input: 我每天早上七点起床。
- Expected-shape output: *Tôi thức dậy lúc bảy giờ sáng mỗi ngày.* ("I get up at seven every morning.")

## 11.4 Write — prompt and example feedback

**Prompt shown to the learner** (topic: *"My daily routine"*):
> 用三到四个句子介绍你的日常生活。
> "Write 3–4 sentences introducing your daily routine."

**Example learner input** (good for test fixtures / `WritingFeedbackServiceImplTest` realism):
> 我每天七点起床。我吃早饭在家。然后我去公司上班坐地铁。晚上我喜欢看电视和睡觉。

**Shape of a realistic response** from `WritingFeedbackService` (matches the JSON contract in `spec/07-external-apis.md` §7.1):
- `correctedText`: 我每天七点起床。我在家吃早饭。然后我坐地铁去公司上班。晚上我喜欢看电视，然后睡觉。
- `comments` (3–4 entries spanning severities):
  - *(error)* "Word order: place before verb" — 我吃早饭在家 → 我在家吃早饭 ("Place phrases like 在家 come before the verb, not after it.")
  - *(error)* "Word order: means of transport" — 我去公司上班坐地铁 → 我坐地铁去公司上班 ("坐地铁 (the method) goes before 去公司 (the action).")
  - *(warn)* "Connecting two actions" — 看电视和睡觉 → 看电视，然后睡觉 ("和 links nouns, not actions. Use 然后 (then) to sequence verbs.")
  - *(info)* "Nice work" — "Your time words (每天, 晚上) are placed correctly — keep it up!"

## Where to apply this

| Round | What to update |
|---|---|
| 14 — Audio recorder | `PronunciationTab` hardcoded reference text → §11.2 sentence |
| 18 — Pronunciation API & UI | `const REFERENCE` → §11.2 sentence |
| 19 — Translation | Use §11.3 pairs for manual verification screenshots |
| 20 — Writing feedback | Use §11.4 prompt/input for manual verification and test fixture realism |
| 21 — Final polish | If a demo script or README screenshot walkthrough is written, follow this scenario end-to-end (order food in Chat → practice the order in Pronounce → translate a related sentence → write about your day) |

This is **content guidance, not a locked decision** — if DeepSeek/Azure return different (but reasonable) results live, that's expected and fine. The point is a consistent *starting point* across rounds, not byte-for-byte matching at runtime.
