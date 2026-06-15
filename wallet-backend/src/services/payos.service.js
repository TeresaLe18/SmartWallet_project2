const { PayOS } = require('@payos/node');

// Lazy-init: chỉ khởi tạo client khi thực sự gọi PayOS, để server vẫn boot được
// khi CHƯA cấu hình khóa (endpoint sẽ trả lỗi rõ ràng thay vì crash toàn server).
let client = null;

function getPayOS() {
  if (!client) {
    const { PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY } = process.env;
    if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY) {
      throw new Error('PayOS chưa được cấu hình: thiếu PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY trong .env');
    }
    client = new PayOS({
      clientId: PAYOS_CLIENT_ID,
      apiKey: PAYOS_API_KEY,
      checksumKey: PAYOS_CHECKSUM_KEY,
    });
  }
  return client;
}

module.exports = { getPayOS };
