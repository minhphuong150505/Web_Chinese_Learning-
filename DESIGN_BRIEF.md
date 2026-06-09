# Design Brief — Chinese Learning App

> Tóm tắt ý tưởng sản phẩm & giao diện, rút từ `spec/`, để dùng làm prompt cho công cụ thiết kế UI (Claude Design / v0 / Figma AI...).

## 1. Sản phẩm là gì

Một web app **chạy local, học tiếng Trung (Mandarin)**, dành cho nhiều người dùng (public, mỗi người đăng nhập bằng email/mật khẩu hoặc Google và chỉ thấy dữ liệu của riêng mình). Không phải hệ thống production hoành tráng — ưu tiên trải nghiệm học tập gọn, nhanh, rõ ràng.

Ba tính năng chính, theo thứ tự ưu tiên:

| # | Tính năng | Mô tả |
|---|-----------|-------|
| 1 | **Trò chuyện thoại với AI** | Người dùng gõ hoặc nói tiếng Trung; AI trả lời bằng văn bản + giọng đọc tự nhiên (TTS). AI đóng vai bạn luyện tập, sửa lỗi cho người dùng. |
| 2 | **Chấm phát âm** | Người dùng đọc to một câu; hệ thống chấm điểm độ chính xác / trôi chảy / hoàn chỉnh / **thanh điệu (tone)** theo từng âm tiết. |
| 3 | **Dịch & nhận xét bài viết** | Dịch Việt↔Trung; chấm bài viết tiếng Trung của người dùng (ngữ pháp, dùng từ). |

## 2. Khung giao diện tổng thể

Ứng dụng **một trang (single page), không có router**, có 4 tab:

```
┌────────────────────────────────────────────────┐
│  Chinese Learning App      [Tên user] [Sign out]│  ← Header
├────────────────────────────────────────────────┤
│  [Chat] [Pronounce] [Translate] [Write]         │  ← TabBar
├────────────────────────────────────────────────┤
│                                                 │
│            <nội dung tab đang chọn>              │
│                                                 │
└────────────────────────────────────────────────┘
```

- Toàn bộ app được **chặn sau màn hình đăng nhập** (sign-in gate). Chưa đăng nhập → chỉ thấy `LoginScreen`.
- Tab bị khóa (chưa hoàn thiện) hiển thị tooltip kiểu "Coming soon".
- Ngôn ngữ giao diện: **tiếng Anh** (toàn bộ label/nút/thông báo). Nội dung người dùng nhập/xem là **tiếng Trung**, có pinyin khi hữu ích.

## 3. Các màn hình chi tiết

### 3.1 Login Screen
- Card căn giữa màn hình: tên app + form đăng nhập/đăng ký email và nút Google (component `<GoogleLogin>`).
- Hiện lỗi inline nếu đăng nhập thất bại.
- Không có form email/password (chỉ Google).

### 3.2 Chat Tab — luyện hội thoại
- Khung chat dạng bong bóng tin nhắn (message bubbles):
  - Tin nhắn người dùng: căn phải.
  - Tin nhắn AI: căn trái, kèm nút phát audio (`<audio controls autoPlay>`) vì AI trả lời bằng giọng nói tự nhiên.
  - Có toggle bật/tắt âm thanh (sound on/off) trong header của tab.
- Ô nhập liệu phía dưới: textarea + nút Send (Cmd/Ctrl+Enter để gửi nhanh), disable khi đang chờ phản hồi.
- Có nút **ghi âm** (record button) để nói thay vì gõ — 3 trạng thái: idle / recording / processing.
- Lịch sử hội thoại được lưu lại, load lại khi refresh trang.
- Trạng thái loading: spinner khi AI đang trả lời.

### 3.3 Pronounce Tab — chấm phát âm
- Người dùng thấy một câu mẫu (reference text) bằng tiếng Trung.
- Bấm nút ghi âm → đọc to câu đó → hệ thống chấm điểm.
- Sau khi có kết quả, hiển thị **ScorePanel**:
  - 4 chỉ số lớn dạng số: **Accuracy / Fluency / Completeness / Prosody (tone)**.
  - Bảng chi tiết theo từng từ/âm tiết, mỗi ô có màu nền theo điểm:
    - 🟩 xanh lá nếu ≥ 85
    - 🟨 vàng nếu 60–84
    - 🟥 đỏ nếu < 60
- Có thể xem lại lịch sử các lần chấm gần đây (top 20).

### 3.4 Translate Tab — dịch Việt↔Trung
- Form đơn giản: ô nhập văn bản, chọn hướng dịch (Vietnamese → Chinese hoặc Chinese → Vietnamese), nút Translate.
- Hiển thị kết quả dịch ngay bên dưới. Không lưu lịch sử (stateless).

### 3.5 Write Tab — nhận xét bài viết
- Người dùng nhập một đoạn văn tiếng Trung (kèm chủ đề tùy chọn — "topic").
- Sau khi submit, hiển thị **WritingFeedbackPanel**:
  - Khối văn bản đã được sửa (corrected text), có style nổi bật.
  - Danh sách nhận xét (comments), mỗi mục có viền trái màu theo mức độ nghiêm trọng (severity): issue + suggestion.

## 4. Component chính cần thiết kế

| Component | Mục đích |
|-----------|----------|
| `LoginScreen` | Card đăng nhập Google, căn giữa |
| `Layout` + `TabBar` | Khung trang, header, thanh tab (có trạng thái disabled + tooltip) |
| `MessageBubble` | Bong bóng chat user/assistant, có thể kèm audio player |
| `MessageList` / `MessageComposer` | Danh sách tin nhắn (auto-scroll) + ô nhập + nút gửi |
| `RecordButton` | Nút ghi âm 3 trạng thái (idle/recording/processing) |
| `ScorePanel` | 4 điểm số lớn + bảng từ chấm màu theo điểm |
| `TranslationForm` | Ô nhập, chọn hướng dịch, kết quả |
| `WritingFeedbackPanel` | Văn bản đã sửa + danh sách nhận xét theo mức độ |
| `Spinner` | Loading indicator dùng chung |

## 5. Phong cách & màu sắc (style guide)

- **Styling**: Tailwind CSS, utility-class only — giao diện gọn nhẹ, không dùng thư viện UI nặng (không MUI/Chakra/Radix).
- **Bảng màu**:
  - Primary: **indigo**
  - Neutral: **slate**
  - Trạng thái điểm số: **đỏ / vàng / xanh lá** (red/yellow/green) theo ngưỡng điểm
- Không cần thiết kế responsive cho mobile (app chạy chủ yếu trên desktop, "No mobile-specific UI").
- Không có chế độ tối/sáng đặc biệt nào được yêu cầu — giữ đơn giản, sáng (light), rõ ràng, dễ đọc cả chữ Latin lẫn chữ Hán.
- Văn bản tiếng Trung cần font dễ đọc, kích thước đủ lớn để luyện đọc/nghe.

## 6. Lưu ý khi đưa cho công cụ thiết kế

- Đây là app học ngôn ngữ — ưu tiên **rõ ràng, ít rối mắt**, để người học tập trung vào nội dung tiếng Trung và phản hồi của AI.
- Cần phân biệt rõ trực quan giữa: tin nhắn của người dùng vs. AI, và giữa các mức điểm số (màu sắc có ý nghĩa, không chỉ trang trí).
- Layout tổng thể: **header cố định + tab bar cố định + vùng nội dung cuộn riêng** theo từng tab.
- Có thể yêu cầu công cụ thiết kế tạo: Login screen, layout chính với 4 tab, và đi sâu vào Chat tab trước (tính năng ưu tiên #1) — sau đó đến Pronounce, Translate, Write.
