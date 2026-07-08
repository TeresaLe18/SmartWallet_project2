# 🏦 Hướng dẫn Chuyển tiền liên kết Ngân hàng (Sandbox Real-time)

Tài liệu này hướng dẫn cách thực hiện chuyển tiền từ ngân hàng liên kết vào tài khoản **`rajpham@gmail.com`** dưới chế độ thử nghiệm (Sandbox) thời gian thực.

## ⚙️ Cơ chế hoạt động của Sandbox
Khi một thành viên thực hiện giao dịch **Chuyển tiền liên ngành (Interbank Transfer)** bằng cách nhập thông tin tài khoản đích:
1. Hệ thống Backend sẽ kiểm tra số tài khoản và mã ngân hàng người nhận.
2. Nếu số tài khoản trùng khớp với tài khoản ngân hàng đã liên kết của một thành viên khác trong hệ thống (ở đây là tài khoản Vietcombank `0967373148` của `rajpham@gmail.com`), Backend sẽ tự động thực hiện **hạch toán cộng số dư ví** cho người nhận trong thời gian thực.
3. Người nhận (`rajpham@gmail.com`) sẽ nhận được thông báo biến động số dư và tăng tiền ngay lập tức.

---

## 📝 Các bước thực hiện kiểm thử

### Bước 1: Đăng nhập vào tài khoản chuyển tiền
1. Truy cập trang đăng nhập tại: [http://localhost:3000/login](http://localhost:3000/login).
2. Đăng nhập bằng tài khoản kiểm thử của **Nguyễn Văn Thuận**:
   - **Email**: `thuan@smartwallet.com`
   - **Mật khẩu**: `thuan@123456`

### Bước 2: Thực hiện Chuyển tiền liên kết ngân hàng
1. Trên giao diện ví, click chọn nút **Chuyển tiền (Transfer)**.
2. Trong phần chọn phương thức chuyển tiền, chọn **Qua Ngân hàng Sandbox (Via Bank Sandbox)**.
3. Nhập thông tin tài khoản nhận tiền của **Raj Pham**:
   - **Chọn ngân hàng (Select Bank)**: `Vietcombank`
   - **Số tài khoản người nhận (Account Number)**: `0967373148`
   - **Tên chủ tài khoản (Account Name)**: `Raj Pham` (hệ thống tự điền hoặc nhập thủ công)
   - **Danh mục (Category)**: Chọn bất kỳ danh mục chi tiêu nào (Ví dụ: `Ăn uống` hoặc `Mua sắm`).
   - **Số tiền chuyển (Amount)**: Nhập tối thiểu từ `10.000` ₫ (Ví dụ: `50.000` ₫).
4. Click **Xác nhận chuyển tiền (Confirm Transfer)**.
5. Nhập mã PIN giao dịch của tài khoản gửi (`1234`) để phê duyệt.

### Bước 3: Xác thực nhận tiền thời gian thực
1. Mở một trình duyệt ẩn danh khác hoặc đăng xuất và đăng nhập bằng tài khoản **Raj Pham**:
   - **Email**: `rajpham@gmail.com`
   - **Mật khẩu**: `rajpham@123456`
2. **Kiểm tra số dư khả dụng**: Bạn sẽ thấy số dư tăng lên tương ứng với số tiền vừa gửi.
3. **Kiểm tra Lịch sử giao dịch**: Xuất hiện một dòng giao dịch nhận tiền mới từ ngân hàng liên kết, hiển thị đầy đủ thông tin người gửi, số tiền, ngày giờ và danh mục chi tiêu.
4. **Kiểm tra Thông báo**: Click vào biểu tượng quả chuông, bạn sẽ nhận được thông báo:
   > *"Bạn vừa nhận được [Số tiền] ₫ chuyển khoản từ ngân hàng Vietcombank (Số TK: 0967373148)..."*
