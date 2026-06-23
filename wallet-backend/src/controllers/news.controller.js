const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');

// Ảnh news lưu trong thư mục con riêng `uploads/news/` cho gọn, tách khỏi KYC/avatar.
// `uploads/` được serve tĩnh ở /api/uploads nên file nằm ở /api/uploads/news/<file>.
const NEWS_DIR = path.join(process.cwd(), 'uploads', 'news');

// Map subtype ảnh -> phần mở rộng file.
const EXT_BY_SUBTYPE = { jpeg: 'jpg', jpg: 'jpg', png: 'png', webp: 'webp', gif: 'gif', svg: 'svg' };

// Nếu `image` là data URL base64 (FE upload ảnh), GIẢI MÃ ghi ra file trong uploads/
// rồi trả về URL tuyệt đối để FE dùng trực tiếp (<img src=...>). Lý do: tránh nhồi
// base64 (vài MB) vào DB -> DB nhẹ, không đụng giới hạn max_allowed_packet, dashboard
// tải nhanh. Nếu `image` đã là URL http(s) (admin dán link) hoặc rỗng -> giữ nguyên.
const persistImage = (image, req) => {
  if (!image || typeof image !== 'string') return null;

  const match = image.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (!match) return image; // đã là URL/chuỗi thường -> giữ nguyên

  const ext = EXT_BY_SUBTYPE[match[1].toLowerCase()] || 'img';
  const buffer = Buffer.from(match[2], 'base64');

  if (!fs.existsSync(NEWS_DIR)) {
    fs.mkdirSync(NEWS_DIR, { recursive: true });
  }

  const filename = `news-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  fs.writeFileSync(path.join(NEWS_DIR, filename), buffer);

  return `${req.protocol}://${req.get('host')}/api/uploads/news/${filename}`;
};

// Chuẩn hoá 1 bản ghi NewsPost về đúng shape mà frontend đọc (8 field).
// Trả thẳng các field FE cần, không lộ created_at/updated_at thừa.
const toPost = (p) => ({
  id: p.id,
  title: p.title,
  title_en: p.title_en || p.title,
  tag: p.tag,
  tag_en: p.tag_en || p.tag,
  time: p.time,
  image: p.image,
  link: p.link,
  content: p.content,
  content_en: p.content_en || p.content,
  active: p.active,
});

// GET /api/news — public: chỉ trả bài đang hiển thị (active = true).
const getNews = async (req, res) => {
  try {
    const posts = await prisma.newsPost.findMany({
      where: { active: true },
      orderBy: { created_at: 'desc' },
    });
    return res.status(200).json({ success: true, posts: posts.map(toPost) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/news/admin — admin: trả tất cả bài (kể cả đang ẩn).
const getAdminNews = async (req, res) => {
  try {
    const posts = await prisma.newsPost.findMany({
      orderBy: { created_at: 'desc' },
    });
    return res.status(200).json({ success: true, posts: posts.map(toPost) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/news/admin — admin tạo bài mới.
const createPost = async (req, res) => {
  try {
    const { title, title_en, tag, tag_en, time, content, content_en, image, link, active } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const post = await prisma.newsPost.create({
      data: {
        title: String(title).trim(),
        title_en: title_en ? String(title_en).trim() : null,
        tag: tag || 'Kinh tế',
        tag_en: tag_en || 'Economic',
        time: time || 'Vừa xong',
        content: content ?? '',
        content_en: content_en ?? '',
        image: persistImage(image, req),
        link: link || null,
        active: active === undefined ? true : Boolean(active),
      },
    });

    return res.status(201).json({ success: true, post: toPost(post) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/news/admin/:id — admin cập nhật bài (partial update).
const updatePost = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const existing = await prisma.newsPost.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const { title, title_en, tag, tag_en, time, content, content_en, image, link, active } = req.body || {};

    if (title !== undefined && !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const post = await prisma.newsPost.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(title_en !== undefined ? { title_en: title_en ? String(title_en).trim() : null } : {}),
        ...(tag !== undefined ? { tag } : {}),
        ...(tag_en !== undefined ? { tag_en } : {}),
        ...(time !== undefined ? { time } : {}),
        ...(content !== undefined ? { content: content ?? '' } : {}),
        ...(content_en !== undefined ? { content_en: content_en ?? '' } : {}),
        ...(image !== undefined ? { image: persistImage(image, req) } : {}),
        ...(link !== undefined ? { link: link || null } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    });

    return res.status(200).json({ success: true, post: toPost(post) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/news/admin/:id — admin xoá bài.
const deletePost = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const existing = await prisma.newsPost.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    await prisma.newsPost.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/news/admin/:id/toggle — admin bật/tắt hiển thị bài.
const toggleActive = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const existing = await prisma.newsPost.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const post = await prisma.newsPost.update({
      where: { id },
      data: { active: !existing.active },
    });

    return res.status(200).json({ success: true, post: toPost(post) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNews,
  getAdminNews,
  createPost,
  updatePost,
  deletePost,
  toggleActive,
};
