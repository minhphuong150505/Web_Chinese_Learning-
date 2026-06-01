# Prompt cho Claude Code — App luyện tiếng Trung

> Copy toàn bộ nội dung dưới đây (từ dòng `---` đầu tiên) và paste vào Claude Code.

---

Tôi muốn bạn giúp tôi xây dựng một web app luyện nói và luyện viết tiếng Trung (中文) chạy local cho mục đích học tập/demo. **Trước khi viết bất kỳ dòng code nào, hãy lên một implementation plan chi tiết và trình bày cho tôi duyệt.** Chỉ bắt đầu code sau khi tôi xác nhận plan.

## Mục tiêu sản phẩm

Một web app giúp người dùng học tiếng Trung qua 4 tính năng, theo thứ tự ưu tiên:

1. **Hội thoại với AI có giọng nói** (ưu tiên cao nhất): người dùng nói hoặc gõ tiếng Trung, AI trả lời bằng text + audio giọng tự nhiên, đóng vai bạn luyện tập và sửa lỗi.
2. **Chấm điểm phát âm**: người dùng đọc một câu, hệ thống chấm điểm accuracy, fluency, completeness và đặc biệt là **thanh điệu (tone)** — yếu tố cốt lõi của tiếng Trung.
3. **Dịch và luyện viết**: dịch Việt–Trung / Trung–Việt, và chấm bài viết tiếng Trung của người dùng (ngữ pháp, dùng từ).
4. **Nhân vật 2D**: một nhân vật 2D nhép miệng theo audio khi AI nói, để giao diện sinh động.

## Tech stack bắt buộc

- **Backend**: Java + Spring Boot (Java 21, Spring Boot 3.x, Maven hoặc Gradle — bạn đề xuất).
- **Frontend**: ReactJS (Vite + TypeScript).
- **Database**: PostgreSQL (chạy bằng Docker) để lưu lịch sử hội thoại và lịch sử điểm.
- **Chạy local**: toàn bộ orchestrate bằng Docker Compose.

## Các API bên ngoài và phân vai rõ ràng

Đây là phần quan trọng nhất, đừng nhầm vai trò các service:

### 1. LLM Trung Quốc — xử lý văn bản (hội thoại, dịch, chấm viết)
- Dùng **Qwen** (Alibaba) hoặc **DeepSeek**. Cả hai đều có API format **tương thích OpenAI**, nên hãy viết một `LlmClient` chung, chỉ cần đổi `base_url` và `model` là chuyển được giữa hai provider.
- DeepSeek base URL: `https://api.deepseek.com`. **Lưu ý quan trọng**: tên model `deepseek-chat` và `deepseek-reasoner` sẽ bị ngừng vào 24/07/2026 — hãy dùng tên mới `deepseek-v4-flash` và `deepseek-v4-pro`. Hãy kiểm tra lại tài liệu chính thức tại api-docs.deepseek.com khi implement.
- Qwen (DashScope) cũng có endpoint tương thích OpenAI — hãy kiểm tra tài liệu Alibaba Cloud Model Studio để lấy base URL và tên model mới nhất.
- **LLM KHÔNG dùng để chấm phát âm** — nó chỉ xử lý text.

### 2. Azure Speech — chấm phát âm (BẮT BUỘC, không thay thế được)
- Dùng **Azure AI Speech — Pronunciation Assessment** với ngôn ngữ `zh-CN`. Đây là giải pháp nghiêm túc duy nhất chấm được phát âm tiếng Trung kèm thanh điệu.
- Free tier (F0) cho 5 giờ speech-to-text/tháng — đủ cho demo.
- Backend nhận file audio từ frontend, gọi Azure Speech SDK (Java), nhận về điểm accuracy/fluency/completeness/prosody và điểm từng từ/âm tiết.
- **Hãy hỏi tôi về Azure credentials trước khi code phần này** — tôi chưa có key, sẽ làm theo hướng dẫn riêng.

### 3. Text-to-Speech — tạo giọng nói cho AI
- Cho bản demo local, ưu tiên **edge-tts** (miễn phí, không cần API key, giọng tiếng Trung neural của Microsoft rất tự nhiên). Có thể chạy như một micro-service Python nhỏ trong Docker Compose, hoặc gọi qua thư viện.
- Để sẵn interface `TtsClient` để sau này dễ đổi sang Azure TTS trả phí nếu cần.

## Yêu cầu kỹ thuật chi tiết

### Backend (Spring Boot)
- Kiến trúc layered rõ ràng: Controller → Service → Client (cho mỗi API ngoài).
- Các service chính: `ConversationService` (điều phối luồng hội thoại), `PronunciationService` (gọi Azure), `TranslationService`, `WritingFeedbackService`, `TtsService`.
- **Quản lý API key an toàn**: tất cả key đặt trong biến môi trường / `application.yml` đọc từ env, KHÔNG hardcode, KHÔNG để lộ ra frontend. Mọi lời gọi API ngoài đều đi qua backend.
- REST endpoints cho từng tính năng; cân nhắc WebSocket cho hội thoại nếu cần streaming phản hồi.
- Lưu lịch sử hội thoại và lịch sử điểm phát âm vào PostgreSQL (hãy đề xuất schema).

### Frontend (React)
- Ghi âm giọng nói bằng **MediaRecorder API** của trình duyệt, gửi audio về backend.
- Giao diện chat hiển thị hội thoại, phát audio trả về, và hiển thị bảng điểm phát âm trực quan (highlight âm tiết sai, hiển thị điểm tone).
- **Nhân vật 2D**: dùng **Live2D Cubism Web SDK** (miễn phí cho cá nhân/demo) với lip-sync theo biên độ audio. Dùng một model mẫu có sẵn, không tự vẽ từ đầu.
- Giao diện sạch, responsive. Hỗ trợ hiển thị pinyin bên cạnh chữ Hán.

## Quy trình tôi muốn bạn tuân theo

1. **Đặt câu hỏi làm rõ** nếu có điểm nào chưa chắc, trước khi lên plan.
2. **Trình bày implementation plan**: kiến trúc tổng thể, cấu trúc thư mục, danh sách các module/endpoint, schema database, thứ tự build theo từng giai đoạn (milestone), và các rủi ro kỹ thuật.
3. **Đề xuất build theo MVP tăng dần**: bắt đầu từ luồng hội thoại text → thêm TTS giọng nói → thêm ghi âm + chấm phát âm Azure → thêm dịch/viết → thêm nhân vật 2D. Mỗi milestone phải chạy được độc lập.
4. **Chờ tôi duyệt plan** rồi mới code.
5. Khi code, làm từng milestone một, có hướng dẫn chạy thử rõ ràng ở mỗi bước.
6. Verify thông tin API (tên model, endpoint, SDK version) bằng tài liệu chính thức mới nhất khi implement, vì các tên model thay đổi theo thời gian.

Hãy bắt đầu bằng việc đặt câu hỏi làm rõ (nếu có) và trình bày implementation plan.
