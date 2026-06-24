# Agent 11: Multi-language (EN/VI) Validator & Integrator

## Objective
Kiểm tra tính hoàn thiện của chế độ song ngữ (Tiếng Anh / Tiếng Việt - EN/VI) trên toàn bộ hệ thống frontend SmartWallet. Đảm bảo rằng việc chuyển đổi ngôn ngữ thay đổi toàn bộ nội dung của trang chứ không chỉ riêng sidebar/navbar.

## Status
- [x] Rà soát toàn bộ các tệp trang (`DashboardHome.jsx`, `Wallets.jsx`, `Kyc.jsx`, `Profile.jsx`, `Investment.jsx`, `Support.jsx`, `Notifications.jsx`, `Offers.jsx`, `MyQr.jsx`, `AiChatbot.jsx`) để phát hiện các chuỗi văn bản bị hardcode (tiếng Anh hoặc tiếng Việt).
- [x] Bổ sung các bản dịch đầy đủ cho các chuỗi văn bản này vào trong [LanguageContext.jsx](file:///d:/New%20folder/backup_project2/wallet-frontend/src/context/LanguageContext.jsx) ở cả hai mục `vi` và `en`.
- [x] Thay thế các chuỗi hardcode bằng biến `t.namespace.key` tương ứng.
- [x] Chạy kiểm thử tự động/thủ công bằng Browser để xác nhận chuyển đổi ngôn ngữ hoạt động 100% trên tất cả các trang.
