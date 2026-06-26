# 📱 SmartWallet (E-Wallet Monorepo)

SmartWallet là một hệ thống ví điện tử toàn diện được mô phỏng theo mô hình hoạt động của các ứng dụng ví nổi tiếng như Momo, ZaloPay và Nimo. Dự án được phát triển dưới dạng Monorepo bao gồm mã nguồn Frontend React và Backend Node.js/Express tích hợp cơ sở dữ liệu MySQL thông qua Prisma ORM.

---

## 📂 Cấu trúc thư mục dự án

```
backup_project2/
├── wallet-frontend/      # Mã nguồn Frontend (React 19 + Vite 6 + Vanilla CSS)
└── wallet-backend/       # Mã nguồn Backend (Express 5 + Prisma ORM + MySQL)
```

---

## 🛠️ Công nghệ sử dụng & Cổng kết nối (Ports)

| Dự án | Công nghệ chủ chốt | Cổng mặc định (Port) |
|---|---|---|
| **Frontend** | React 19, Vite 6, Vanilla CSS (Thiết kế tùy chỉnh cao cấp), Framer Motion, Lucide Icons, Axios | `3000` |
| **Backend** | Express 5, Prisma ORM, MySQL, JSON Web Tokens (JWT), Bcrypt, Nodemon | `5000` |

---

## ✨ Các chức năng chính của Ví

1. **Nạp tiền (Deposit)**:
   - Nạp tiền từ tài khoản ngân hàng đã liên kết (ngay lập tức).
   - Nạp tiền qua mã QR MBBank tự động tích hợp cổng thử nghiệm **PayOS**.
2. **Rút tiền (Withdraw)**:
   - Rút tiền từ ví về tài khoản ngân hàng liên kết (yêu cầu mã PIN giao dịch 4 số).
3. **Chuyển tiền (Transfer)**:
   - **Chuyển tiền ví-qua-ví (SmartWallet)**: Chuyển tiền nhanh bằng Số điện thoại hoặc Email đã đăng ký thành viên. Tích hợp áp dụng **Mã giảm giá/Voucher** theo danh mục chi tiêu.
   - **Chuyển tiền qua Ngân hàng Sandbox**: Nhập thủ công số tài khoản hoặc **Tải ảnh QR thanh toán lên để hệ thống tự động quét và phân tích thông tin**.
4. **Liên kết ngân hàng**: Hỗ trợ liên kết tối đa 3 tài khoản ngân hàng đồng thời, hiển thị thanh tiến trình trực quan với cảnh báo giới hạn.
5. **Xác thực danh tính (KYC)**:
   - Tải lên ảnh mặt trước CCCD, mặt sau CCCD và ảnh selfie chân dung để xác thực tài khoản.
   - Phân chia hạn mức và cấp quyền giao dịch dựa trên trạng thái KYC (Chưa xác thực, Đang chờ duyệt, Đã duyệt).
6. **Đóng băng ví (Freeze)**: Khóa toàn bộ các giao dịch nạp/rút/chuyển trong trường hợp khẩn cấp để bảo vệ số dư.
7. **Đa giao diện (Light/Dark Mode)**: Hỗ trợ chuyển đổi nhanh giao diện tối và giao diện sáng với biến CSS mượt mà.
8. **Đa ngôn ngữ (VI/EN)**: Chuyển đổi linh hoạt toàn bộ giao diện và các hộp thoại modal giữa Tiếng Việt và Tiếng Anh.

---

## 🚀 Hướng dẫn khởi chạy dự án

### Yêu cầu hệ thống:
- Node.js bản 18+
- MySQL Server đang hoạt động (ví dụ: XAMPP, Laragon hoặc MySQL cục bộ trên cổng 3306).

---

### Bước 1: Cấu hình và Chạy Backend

1. Di chuyển vào thư mục backend:
   ```bash
   cd wallet-backend
   npm install
   ```

2. Tạo tệp cấu hình môi trường `.env` nằm trong thư mục `wallet-backend/` với nội dung mẫu sau:
   ```env
   DATABASE_URL="mysql://root@localhost:3306/wallet_db"
   JWT_SECRET=super_secret_jwt_key_12345
   JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_12345
   EMAIL_USER=your@gmail.com
   EMAIL_PASS=your_app_password
   PORT=5000
   ```

3. Đồng bộ cơ sở dữ liệu và sinh Prisma Client:
   ```bash
   npx prisma db push
   ```

4. Khởi chạy cơ sở dữ liệu mẫu (Seed Users, KYC & Demo Data):
   ```bash
   # Tạo tài khoản thử nghiệm
   node src/seedUsers.js
   
   # Xác thực danh tính KYC mặc định cho các tài khoản test
   node src/seedKyc.js

   # Tạo dữ liệu mẫu cho ví tiết kiệm, tích lũy và thống kê
   node src/seedDemo.js
   ```

5. Khởi chạy máy chủ backend ở chế độ phát triển:
   ```bash
   npm run dev
   ```

---

### Bước 2: Cấu hình và Chạy Frontend

1. Di chuyển vào thư mục frontend:
   ```bash
   cd ../wallet-frontend
   npm install
   ```

2. Khởi chạy máy chủ phát triển frontend:
   ```bash
   npm run dev
   ```

3. Mở trình duyệt và truy cập: [http://localhost:3000](http://localhost:3000)

---

## 🔒 Danh sách tài khoản thử nghiệm có sẵn

Quy ước mật khẩu chung: `<tên trước ký tự @ của email>@123456`

| Email | Vai trò (Role) | Trạng thái KYC | Số dư ví mặc định | Mật khẩu mặc định |
|---|---|---|---|---|
| **`rajpham@gmail.com`** | `USER` | **`VERIFIED`** | `100.000.000 ₫` | `rajpham@123456` |
| **`thuan@smartwallet.com`** | `USER` | **`VERIFIED`** | `100.000.000 ₫` | `thuan@123456` |
| **`duyen@smartwallet.com`** | `USER` | `UNVERIFIED` | `100.000.000 ₫` | `duyen@123456` |
| **`phong@smartwallet.com`** | `USER` | `UNVERIFIED` | `100.000.000 ₫` | `phong@123456` |
| **`admin@smartwallet.com`** | `ADMIN` | `VERIFIED` | *(Không có)* | `admin@123456` |

---

## 🧪 Kiểm thử tự động (Integration Testing)

Hệ thống đi kèm bộ kịch bản kiểm thử tích hợp tự động cho API giao dịch ví (Nạp tiền, Rút tiền, Chuyển tiền ví-ví, cấu hình PIN giao dịch):

1. Đảm bảo cổng `5555` không bị chiếm dụng.
2. Di chuyển vào thư mục `wallet-backend` và chạy lệnh:
   ```bash
   node src/test_wallet.js
   ```
Kịch bản sẽ tự động khởi tạo máy chủ test, chạy kiểm thử các luồng API và tự động tắt máy chủ khi hoàn thành.
