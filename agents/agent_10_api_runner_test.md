# Agent 10: API Runner & Test

## Objective
Kiểm tra và chạy các API backend, sửa lỗi kết nối database và chạy dữ liệu mẫu (seed).

## Status
- [x] Khởi chạy cơ sở dữ liệu MySQL trên máy cục bộ ở cổng `3306`.
- [x] Cập nhật lại mật khẩu và thông tin kết nối database `DATABASE_URL` trong tệp `.env` của backend.
- [x] Đồng bộ cấu hình các bảng dữ liệu bằng lệnh `npx prisma db push`.
- [x] Chạy các lệnh nạp dữ liệu mẫu `node src/seedUsers.js` và `node src/seedDemo.js`.
- [x] Chạy kiểm thử tự động hoặc kiểm thử thủ công qua API để đảm bảo nạp/rút/chuyển tiền/AI chatbot hoạt động ổn định.
