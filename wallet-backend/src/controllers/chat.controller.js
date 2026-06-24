const prisma = require('../config/prisma');

const getFinancialAdvisorResponse = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey || geminiApiKey === 'YOUR_GEMINI_API_KEY') {
      return res.status(400).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured in the backend .env file. Please add your key to continue.',
      });
    }

    // 1. Fetch user info, wallet, and transactions to provide context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: {
          include: {
            received_transactions: {
              take: 5,
              orderBy: { created_at: 'desc' },
              include: { category: true }
            },
            sent_transactions: {
              take: 5,
              orderBy: { created_at: 'desc' },
              include: { category: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const balance = user.wallet ? Number(user.wallet.balance) : 0;
    
    // Combine and sort recent transactions
    const incoming = (user.wallet?.received_transactions || []).map(t => ({ ...t, type: 'INCOME' }));
    const outgoing = (user.wallet?.sent_transactions || []).map(t => ({ ...t, type: 'EXPENSE' }));
    const recentTxs = [...incoming, ...outgoing]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    const txsContext = recentTxs.map(t => {
      const typeLabel = t.type === 'INCOME' ? 'Nhận tiền (+)' : 'Chuyển/Rút/Thanh toán (-)';
      return `- Số tiền: ${Number(t.amount).toLocaleString('vi-VN')} VND | Loại: ${typeLabel} | Danh mục: ${t.category?.name || 'Không phân loại'} | Nội dung: ${t.message || 'Không có'} | Ngày: ${new Date(t.created_at).toLocaleDateString('vi-VN')}`;
    }).join('\n');

    // 2. Prepare system prompt
    const systemPrompt = `Bạn là Trợ lý Tư vấn Tài chính AI của hệ thống SmartWallet. Nhiệm vụ của bạn là tư vấn chi tiêu thông minh, lập kế hoạch tiết kiệm và hỗ trợ quản lý tài chính cho người dùng một cách thân thiện và chính xác.

Thông tin tài chính hiện tại của khách hàng:
- Email khách hàng: ${user.email}
- Số dư ví khả dụng hiện tại: ${balance.toLocaleString('vi-VN')} VND
- Lịch sử 10 giao dịch gần nhất của khách hàng:
${txsContext || 'Chưa có lịch sử giao dịch.'}

Quy tắc ứng xử:
- Hãy trả lời bằng tiếng Việt (hoặc ngôn ngữ của người dùng nếu họ hỏi bằng tiếng Anh).
- Giữ câu trả lời ngắn gọn, súc tích, dễ hiểu và chuyên nghiệp.
- Khi người dùng hỏi về kế hoạch tiết kiệm hoặc phân tích chi tiêu, hãy dùng thông tin số dư và giao dịch thực tế ở trên để đưa ra lời khuyên thực tế.
- Sử dụng định dạng Markdown đẹp, phân chia các ý rõ ràng.`;

    // 3. Format contents history for Gemini API
    // Gemini API format: [{ role: 'user'|'model', parts: [{ text: string }] }]
    const contents = [];
    
    if (history && Array.isArray(history)) {
      history.forEach(h => {
        const role = h.sender === 'user' ? 'user' : 'model';
        contents.push({
          role: role,
          parts: [{ text: h.text }]
        });
      });
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // 4. Call Google Gemini API directly using fetch
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7,
          }
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi chưa thể trả lời lúc này.';

    return res.status(200).json({
      success: true,
      reply: replyText,
    });

  } catch (error) {
    console.error('Gemini financial advisor error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'System error. Please try again.',
    });
  }
};

module.exports = {
  getFinancialAdvisorResponse,
};
