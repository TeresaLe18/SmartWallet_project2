# 📱 Hướng dẫn Quét mã QR chuyển tiền (Sandbox QR Upload)

Tài liệu này hướng dẫn cách mô phỏng và thực hiện quét mã QR VietQR để chuyển tiền từ ngân hàng liên kết vào tài khoản **`rajpham@gmail.com`** thời gian thực.

## ⚙️ Cơ chế hoạt động của QR Sandbox
1. Trên giao diện ví di động thực tế, người dùng sử dụng camera để quét mã VietQR tĩnh/động.
2. Trong môi trường trình duyệt Sandbox này, camera được thay thế bằng tính năng **Tải lên hình ảnh mã QR (Upload QR Image)**.
3. Để thử nghiệm quét QR nhanh chóng mà không cần tệp ảnh VietQR thật, Frontend tích hợp một bộ **giải mã thông minh mô phỏng qua tên file**:
   - Nếu bạn tải lên bất kỳ tệp ảnh nào có tên chứa từ khóa **`rajpham`** hoặc **`raj`** (Ví dụ: `rajpham-qr.png`, `raj_qr.jpg`, v.v.), hệ thống sẽ tự động hiểu đây là mã VietQR định danh của chủ ví Raj Pham.
   - Các thông tin tài khoản ngân hàng nhận tiền (`Vietcombank` - `0967373148` - `Raj Pham`) sẽ tự động được giải mã và điền sẵn vào form chuyển khoản.

---

## 📝 Các bước thực hiện kiểm thử

### Bước 1: Tạo tệp ảnh quét mô phỏng
1. Bạn có thể sử dụng bất kỳ ảnh chụp màn hình hoặc hình ảnh nhỏ nào có sẵn trên máy tính.
2. Đổi tên tệp ảnh đó thành: **`rajpham.png`** (hoặc `raj.jpg`, `rajpham_qr.png`).

### Bước 2: Tải ảnh lên trên giao diện Chuyển tiền
1. Đăng nhập vào tài khoản người gửi (Ví dụ: `thuan@smartwallet.com` / `thuan@123456`).
2. Click chọn **Chuyển tiền (Transfer)**.
3. Chọn phương thức **Qua Ngân hàng Sandbox (Via Bank Sandbox)**.
4. Ở mục **Tải lên ảnh mã QR ngân hàng (Upload bank QR code image)**, click vào khung tải lên và chọn tệp ảnh **`rajpham.png`** đã chuẩn bị ở Bước 1.

### Bước 3: Hoàn thành giao dịch chuyển tiền
1. Ngay khi tải ảnh lên, hệ thống sẽ hiển thị toast thông báo: *"Đang quét mã QR..."*
2. Sau 1 giây xử lý giả lập, các thông tin nhận tiền của **Raj Pham** sẽ được điền tự động:
   - Ngân hàng: `Vietcombank`
   - Số tài khoản: `0967373148`
   - Tên chủ tài khoản: `Raj Pham`
   - Số tiền: `100.000` ₫
   - Nội dung: `Chuyển khoản QR Sandbox cho Raj Pham`
3. Click **Xác nhận chuyển tiền (Confirm Transfer)** và nhập mã PIN giao dịch của bạn (`1234`).
4. Giao dịch hoàn tất, tiền sẽ được chuyển từ ví của bạn vào ví của **Raj Pham** ở thời gian thực qua cơ chế định tuyến sandbox.
