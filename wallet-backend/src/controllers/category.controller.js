const prisma = require('../config/prisma');

// Category chi tiêu (mua sắm, ăn uống,...). Tên unique.
const listCategories = async (req, res) => {
  try {
    const data = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    return res.status(200).json({ success: true, data: cat });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Tên category là bắt buộc' });
    const cat = await prisma.category.create({ data: { name: String(name).trim() } });
    return res.status(201).json({ success: true, data: cat });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Tên category đã tồn tại' });
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const existed = await prisma.category.findUnique({ where: { id } });
    if (!existed) return res.status(404).json({ success: false, message: 'Category not found' });

    const { name } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Tên category là bắt buộc' });

    const cat = await prisma.category.update({ where: { id }, data: { name: String(name).trim() } });
    return res.status(200).json({ success: true, data: cat });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Tên category đã tồn tại' });
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const existed = await prisma.category.findUnique({ where: { id } });
    if (!existed) return res.status(404).json({ success: false, message: 'Category not found' });
    await prisma.category.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
