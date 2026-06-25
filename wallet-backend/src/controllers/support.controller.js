const prisma = require('../config/prisma');

// ─── USER: Gửi tin nhắn ────────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message, image_url } = req.body;

    if (!message && !image_url) {
      return res.status(400).json({ success: false, message: 'Tin nhắn không được trống.' });
    }

    const msg = await prisma.supportMessage.create({
      data: {
        user: { connect: { id: userId } },
        is_admin: false,
        message: message || null,
        image_url: image_url || null,
        is_read: false,
      },
    });

    return res.status(201).json({ success: true, data: msg });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ─── USER: Lấy toàn bộ lịch sử chat của mình ──────────────────────────────────
const getMyMessages = async (req, res) => {
  try {
    const userId = req.user.userId;

    const messages = await prisma.supportMessage.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });

    // Đánh dấu tất cả tin admin chưa đọc là đã đọc
    await prisma.supportMessage.updateMany({
      where: { user_id: userId, is_admin: true, is_read: false },
      data: { is_read: true },
    });

    return res.json({ success: true, data: messages });
  } catch (err) {
    console.error('getMyMessages error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ─── USER: Số tin nhắn chưa đọc từ admin ──────────────────────────────────────
const getMyUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await prisma.supportMessage.count({
      where: { user_id: userId, is_admin: true, is_read: false },
    });
    return res.json({ success: true, count });
  } catch (err) {
    console.error('getMyUnreadCount error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ─── ADMIN: Lấy danh sách user đang có cuộc trò chuyện ───────────────────────
const listConversations = async (req, res) => {
  try {
    // Lấy danh sách user_id distinct có tin nhắn
    const distinctUsers = await prisma.supportMessage.findMany({
      distinct: ['user_id'],
      select: { user_id: true },
    });

    const conversations = await Promise.all(
      distinctUsers.map(async ({ user_id }) => {
        const [user, lastMsg, unreadCount] = await Promise.all([
          prisma.user.findUnique({
            where: { id: user_id },
            select: {
              id: true,
              email: true,
              phone: true,
              kyc: { select: { full_name: true } },
            },
          }),
          prisma.supportMessage.findFirst({
            where: { user_id },
            orderBy: { created_at: 'desc' },
          }),
          prisma.supportMessage.count({
            where: { user_id, is_admin: false, is_read: false },
          }),
        ]);

        return {
          user_id,
          email: user?.email || '',
          phone: user?.phone || '',
          full_name: user?.kyc?.full_name || null,
          last_message: lastMsg?.message || null,
          last_image_url: lastMsg?.image_url || null,
          last_message_at: lastMsg?.created_at || null,
          unread_count: Number(unreadCount),
        };
      })
    );

    // Sắp xếp theo last_message_at DESC
    conversations.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

    return res.json({ success: true, data: conversations });
  } catch (err) {
    console.error('listConversations error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ─── ADMIN: Lấy tin nhắn của 1 user cụ thể ───────────────────────────────────
const getConversation = async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'userId không hợp lệ.' });
    }

    const messages = await prisma.supportMessage.findMany({
      where: { user_id: targetUserId },
      orderBy: { created_at: 'asc' },
    });

    // Đánh dấu tin nhắn user chưa đọc là đã đọc
    await prisma.supportMessage.updateMany({
      where: { user_id: targetUserId, is_admin: false, is_read: false },
      data: { is_read: true },
    });

    return res.json({ success: true, data: messages });
  } catch (err) {
    console.error('getConversation error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ─── ADMIN: Trả lời tin nhắn của user ────────────────────────────────────────
const adminReply = async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const { message, image_url } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'userId không hợp lệ.' });
    }
    if (!message && !image_url) {
      return res.status(400).json({ success: false, message: 'Tin nhắn không được trống.' });
    }

    const msg = await prisma.supportMessage.create({
      data: {
        user: { connect: { id: targetUserId } },
        is_admin: true,
        message: message || null,
        image_url: image_url || null,
        is_read: false,
      },
    });

    // Notify the user about the support message
    await prisma.notification.create({
      data: {
        user_id: targetUserId,
        title: 'Tin nhắn hỗ trợ mới 💬',
        content: message || 'Bạn nhận được một ảnh đính kèm từ quản trị viên.',
      },
    });

    return res.status(201).json({ success: true, data: msg });
  } catch (err) {
    console.error('adminReply error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ─── ADMIN: Tổng số tin nhắn chưa đọc từ users ───────────────────────────────
const adminUnreadCount = async (req, res) => {
  try {
    const count = await prisma.supportMessage.count({
      where: { is_admin: false, is_read: false },
    });
    return res.json({ success: true, count });
  } catch (err) {
    console.error('adminUnreadCount error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = {
  sendMessage,
  getMyMessages,
  getMyUnreadCount,
  listConversations,
  getConversation,
  adminReply,
  adminUnreadCount,
};
