import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken, requireRole(['ADMIN']));

// GET /api/admin/branches
router.get('/branches', async (_req: Request, res: Response) => {
  const branches = await prisma.branch.findMany({
    include: { _count: { select: { users: true, orders: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(branches);
});

// POST /api/admin/branches
router.post('/branches', async (req: Request, res: Response) => {
  const { name, location, city, phone } = req.body as {
    name: string; location: string; city: string; phone?: string;
  };

  if (!name || !location || !city) {
    res.status(400).json({ error: 'name, location and city are required.' });
    return;
  }

  const branch = await prisma.branch.create({ data: { name, location, city, phone } });
  res.status(201).json({ message: 'Branch created.', branch });
});

// PATCH /api/admin/branches/:id/toggle
router.patch('/branches/:id/toggle', async (req: Request, res: Response) => {
  const id = parseInt(String(req.params['id'] ?? '0'));
  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) { res.status(404).json({ error: 'Branch not found.' }); return; }
  const updated = await prisma.branch.update({ where: { id }, data: { isActive: !branch.isActive } });
  res.json({ message: `Branch ${updated.isActive ? 'activated' : 'deactivated'}.`, branch: updated });
});

// GET /api/admin/users
router.get('/users', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true,
      isActive: true, branchId: true, createdAt: true,
      branch: { select: { name: true, city: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

// POST /api/admin/users
router.post('/users', async (req: Request, res: Response) => {
  const { name, email, password, role, branchId } = req.body as {
    name: string; email: string; password: string; role: string; branchId?: number;
  };

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'name, email, password and role are required.' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name, email, password: hashedPassword,
        role: role as 'ADMIN' | 'OPERATIONAL' | 'MANAGEMENT' | 'SENIOR',
        branchId: branchId ?? null,
      },
    });
    res.status(201).json({ message: 'User created.', userId: user.id });
  } catch {
    res.status(409).json({ error: 'Email already in use.' });
  }
});

// PATCH /api/admin/users/:id/terminate
router.patch('/users/:id/terminate', async (req: Request, res: Response) => {
  const id = parseInt(String(req.params['id'] ?? '0'));
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  res.json({ message: 'Account terminated.' });
});

// PATCH /api/admin/users/:id/activate
router.patch('/users/:id/activate', async (req: Request, res: Response) => {
  const id = parseInt(String(req.params['id'] ?? '0'));
  await prisma.user.update({ where: { id }, data: { isActive: true } });
  res.json({ message: 'Account activated.' });
});

// GET /api/admin/stats
router.get('/stats', async (_req: Request, res: Response) => {
  const [totalBranches, totalUsers, totalOrders, totalMenuItems] = await Promise.all([
    prisma.branch.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true, role: { not: 'ADMIN' } } }),
    prisma.order.count(),
    prisma.menuItem.count({ where: { isActive: true } }),
  ]);
  res.json({ totalBranches, totalUsers, totalOrders, totalMenuItems });
});

// GET /api/admin/menu
router.get('/menu', async (_req: Request, res: Response) => {
  const items = await prisma.menuItem.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  res.json(items);
});

// POST /api/admin/menu
router.post('/menu', async (req: Request, res: Response) => {
  const { name, category, price } = req.body as { name: string; category: string; price: number };
  if (!name || !category || !price) {
    res.status(400).json({ error: 'name, category and price are required.' });
    return;
  }
  const item = await prisma.menuItem.create({ data: { name, category, price: Number(price) } });
  res.status(201).json({ message: 'Menu item created.', item });
});

// PATCH /api/admin/menu/:id/toggle
router.patch('/menu/:id/toggle', async (req: Request, res: Response) => {
  const id = parseInt(String(req.params['id'] ?? '0'));
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) { res.status(404).json({ error: 'Menu item not found.' }); return; }
  const updated = await prisma.menuItem.update({ where: { id }, data: { isActive: !item.isActive } });
  res.json({ message: `Item ${updated.isActive ? 'activated' : 'deactivated'}.`, item: updated });
});

export default router;
