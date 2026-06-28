# Agent 6: QR Payment Specialist

## Objective
Tách tính năng quét QR chuyển tiền ra khỏi giao diện chuyển tiền ngân hàng thủ công.

## Status
- [x] Refactor `Wallets.jsx`: Remove the QR upload box from the Bank Transfer modal.
- [x] Create a separate Action/Modal specifically for QR scanning and transfer.
- [x] Test the sandbox route parsing filenames (e.g. `rajpham.png` / `thuan.png`).
- [x] Thống nhất mã QR hiển thị ở ví trùng định dạng JSON với tab QR code (`Wallets.jsx`, `MyQr.jsx`).
- [x] Tối ưu bộ giả lập quét QR file để nhận diện chính xác tên người nhận từ CCCD (Duyên, Phong) và các file QR đã tải xuống (`smartwallet-qr-name-id.png`).
