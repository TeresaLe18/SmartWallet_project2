const prisma = require('../config/prisma');
const { getPayOS } = require('../services/payos.service');

// Cộng tiền nạp vào ví ATOMIC + ghi ledger + set SUCCESS. Dùng chung cho webhook và
// polling. Guard theo status=PENDING -> chạy 1 lần duy nhất (chống cộng tiền 2 lần).
async function creditDeposit(orderCode, amountFromProvider) {
  return prisma.$transaction(async (tx) => {
    const pending = await tx.transaction.findFirst({
      where: {
        provider_reference_code: String(orderCode),
        status: 'PENDING',
        transaction_type: 'DEPOSIT',
      },
    });
    if (!pending) return { credited: false, reason: 'NO_PENDING' };

    await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${pending.receiver_wallet_id} FOR UPDATE`;
    const wallet = await tx.wallet.findUnique({ where: { id: pending.receiver_wallet_id } });
    const balanceBefore = Number(wallet.balance);
    const amount = Number(amountFromProvider != null ? amountFromProvider : pending.amount);
    const balanceAfter = balanceBefore + amount;

    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
    await tx.transaction.update({ where: { id: pending.id }, data: { status: 'SUCCESS' } });
    await tx.ledgerEntry.create({
      data: {
        transaction_id: pending.id,
        wallet_id: wallet.id,
        type: 'CREDIT',
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
      },
    });
    return { credited: true, newBalance: balanceAfter };
  });
}

// POST /api/payos/create-payment-link — tạo link + QR ngân hàng thật để nạp tiền.
async function createPaymentLink(req, res) {
  try {
    const { amount, note, origin } = req.body || {};
    const userId = req.user.userId;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền nạp phải lớn hơn 0.' });
    }
    if (amount < 1000) {
      return res.status(400).json({ success: false, message: 'Số tiền nạp tối thiểu là 1.000đ.' });
    }

    const wallet = await prisma.wallet.findUnique({ where: { user_id: userId } });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ví người dùng.' });
    }

    const orderCode = Number(`${Date.now()}`.slice(-9));
    const description = `SWDEP${orderCode}`.slice(0, 25);
    const frontendUrl = origin || (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0];

    const paymentData = {
      orderCode,
      amount: Math.round(amount),
      description,
      returnUrl: `${frontendUrl}/dashboard/wallets?deposit=${orderCode}`,
      cancelUrl: `${frontendUrl}/payment/cancel?orderCode=${orderCode}`,
    };

    const paymentLinkResponse = await getPayOS().paymentRequests.create(paymentData);

    // Lưu giao dịch PENDING để đối soát khi webhook/polling báo PAID.
    await prisma.transaction.create({
      data: {
        transaction_type: 'DEPOSIT',
        amount,
        fee_amount: 0,
        discount_amount: 0,
        final_amount: amount,
        receiver_wallet_id: wallet.id,
        payment_method: 'BANK',
        status: 'PENDING',
        message: note || `Nạp tiền qua PayOS - ${orderCode}`,
        reference_code: `PAYOS-${orderCode}`,
        provider_reference_code: String(orderCode),
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        checkoutUrl: paymentLinkResponse.checkoutUrl,
        qrCode: paymentLinkResponse.qrCode,
        orderCode,
        paymentLinkId: paymentLinkResponse.paymentLinkId,
      },
    });
  } catch (error) {
    console.error('[PayOS] createPaymentLink error:', error);
    return res.status(500).json({ success: false, message: 'Không thể tạo link thanh toán.', error: error.message });
  }
}

// POST /api/payos/webhook — PayOS callback khi giao dịch hoàn tất.
async function payosWebhook(req, res) {
  try {
    const webhookData = await getPayOS().webhooks.verify(req.body);
    const { orderCode, amount, code } = webhookData;
    console.log(`[PayOS Webhook] orderCode=${orderCode} code=${code} amount=${amount}`);

    if (code !== '00') {
      return res.status(200).json({ success: true, message: 'Không phải giao dịch thành công.' });
    }

    const result = await creditDeposit(orderCode, amount);
    if (result.credited) {
      console.log(`[PayOS Webhook] ✅ Cộng ${amount}đ (orderCode=${orderCode})`);
    }
    return res.status(200).json({ success: true, message: result.credited ? 'OK' : 'Không tìm thấy giao dịch pending.' });
  } catch (error) {
    console.error('[PayOS Webhook] Error:', error);
    return res.status(200).json({ success: false, message: error.message });
  }
}

// GET /api/payos/check/:orderCode — FE polling trạng thái (fallback khi webhook chưa tới).
async function checkPaymentStatus(req, res) {
  try {
    const { orderCode } = req.params;

    const txRow = await prisma.transaction.findFirst({
      where: { provider_reference_code: String(orderCode) },
    });

    if (txRow && txRow.status === 'SUCCESS') {
      const wallet = await prisma.wallet.findUnique({ where: { id: txRow.receiver_wallet_id } });
      return res.status(200).json({
        success: true,
        status: 'PAID',
        message: 'Thanh toán thành công!',
        newBalance: wallet ? Number(wallet.balance) : null,
      });
    }

    const paymentInfo = await getPayOS().paymentRequests.get(orderCode);

    if (paymentInfo.status === 'PAID' && txRow && txRow.status === 'PENDING') {
      const result = await creditDeposit(orderCode, txRow.amount);
      return res.status(200).json({
        success: true,
        status: 'PAID',
        message: 'Nạp tiền thành công! Số dư đã được cập nhật.',
        newBalance: result.newBalance,
      });
    }

    if (paymentInfo.status === 'CANCELLED') {
      if (txRow && txRow.status === 'PENDING') {
        await prisma.transaction.update({ where: { id: txRow.id }, data: { status: 'FAILED' } });
      }
      return res.status(200).json({ success: true, status: 'CANCELLED', message: 'Giao dịch đã bị huỷ.' });
    }

    return res.status(200).json({ success: true, status: paymentInfo.status, message: 'Đang chờ thanh toán...' });
  } catch (error) {
    console.error('[PayOS] checkPaymentStatus error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi kiểm tra trạng thái.', error: error.message });
  }
}

module.exports = { createPaymentLink, payosWebhook, checkPaymentStatus };
