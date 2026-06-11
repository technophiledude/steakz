import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken, requireRole(['OPERATIONAL', 'MANAGEMENT', 'SENIOR', 'ADMIN']));

// ── ORDERS ────────────────────────────────────────────────────────────────────

// GET /api/operational/orders — today's orders for user's branch
router.get('/orders', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId;
  if (!branchId) { res.status(400).json({ error: 'No branch assigned.' }); return; }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const orders = await prisma.order.findMany({
    where:   { branchId, createdAt: { gte: today, lt: tomorrow } },
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

// POST /api/operational/orders — create a new order
router.post('/orders', async (req: Request, res: Response) => {
  const branchId  = req.user!.branchId;
  const createdById = req.user!.id;

  if (!branchId) { res.status(400).json({ error: 'No branch assigned.' }); return; }

  const { tableNumber, items } = req.body as {
    tableNumber?: number;
    items: Array<{ menuItemId: number; quantity: number }>;
  };

  if (!items || items.length === 0) {
    res.status(400).json({ error: 'At least one item is required.' });
    return;
  }

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((i) => i.menuItemId) }, isActive: true },
  });

  if (menuItems.length !== items.length) {
    res.status(400).json({ error: 'One or more menu items not found or inactive.' });
    return;
  }

  const total = items.reduce((sum, item) => {
    const found = menuItems.find((m) => m.id === item.menuItemId);
    return sum + (found ? found.price * item.quantity : 0);
  }, 0);

  const order = await prisma.order.create({
    data: {
      branchId,
      tableNumber,
      createdById,
      total: Math.round(total * 100) / 100,
      items: {
        create: items.map((item) => {
          const found = menuItems.find((m) => m.id === item.menuItemId)!;
          return { menuItemId: item.menuItemId, quantity: item.quantity, unitPrice: found.price };
        }),
      },
    },
    include: { items: { include: { menuItem: true } } },
  });

  res.status(201).json({ message: 'Order created.', order });
});

// PATCH /api/operational/orders/:id/status
router.patch('/orders/:id/status', async (req: Request, res: Response) => {
  const id = parseInt(String(req.params['id'] ?? '0'));
  const { status } = req.body as { status: string };

  const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data:  { status: status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' },
  });
  res.json({ message: 'Order status updated.', order: updated });
});

// ── MENU ──────────────────────────────────────────────────────────────────────

// GET /api/operational/menu
router.get('/menu', async (_req: Request, res: Response) => {
  const items = await prisma.menuItem.findMany({
    where:   { isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json(items);
});

// ── STOCK REQUESTS ────────────────────────────────────────────────────────────

// GET /api/operational/stock
router.get('/stock', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId;
  if (!branchId) { res.status(400).json({ error: 'No branch assigned.' }); return; }

  const items = await prisma.stockItem.findMany({
    where:   { branchId },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json(items);
});

// POST /api/operational/stock/request
router.post('/stock/request', async (req: Request, res: Response) => {
  const requestedById = req.user!.id;
  const { stockItemId, quantity, notes } = req.body as {
    stockItemId: number; quantity: number; notes?: string;
  };

  if (!stockItemId || !quantity) {
    res.status(400).json({ error: 'stockItemId and quantity are required.' });
    return;
  }

  const request = await prisma.stockRequest.create({
    data: {
      stockItemId: Number(stockItemId),
      quantity:    Number(quantity),
      notes,
      requestedById,
    },
  });
  res.status(201).json({ message: 'Stock request submitted.', request });
});

// GET /api/operational/stock/requests
router.get('/stock/requests', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId;
  if (!branchId) { res.status(400).json({ error: 'No branch assigned.' }); return; }

  const requests = await prisma.stockRequest.findMany({
    where:   { stockItem: { branchId } },
    include: { stockItem: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

// ── TIMESHEETS ────────────────────────────────────────────────────────────────

// GET /api/operational/timesheets — my timesheets
router.get('/timesheets', async (req: Request, res: Response) => {
  const userId   = req.user!.id;
  const branchId = req.user!.branchId;

  const timesheets = await prisma.timesheet.findMany({
    where:   { userId, branchId: branchId ?? undefined },
    orderBy: { date: 'desc' },
    take:    30,
  });
  res.json(timesheets);
});

// POST /api/operational/timesheets
router.post('/timesheets', async (req: Request, res: Response) => {
  const userId   = req.user!.id;
  const branchId = req.user!.branchId;

  if (!branchId) { res.status(400).json({ error: 'No branch assigned.' }); return; }

  const { date, hoursWorked, notes } = req.body as {
    date: string; hoursWorked: number; notes?: string;
  };

  if (!date || !hoursWorked) {
    res.status(400).json({ error: 'date and hoursWorked are required.' });
    return;
  }

  const timesheet = await prisma.timesheet.create({
    data: { userId, branchId, date: new Date(date), hoursWorked: Number(hoursWorked), notes },
  });
  res.status(201).json({ message: 'Timesheet submitted.', timesheet });
});

// ── TASKS ─────────────────────────────────────────────────────────────────────

// GET /api/operational/tasks
router.get('/tasks', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId;
  if (!branchId) { res.status(400).json({ error: 'No branch assigned.' }); return; }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasks = await prisma.task.findMany({
    where:   {
      branchId,
      OR: [
        { dueDate: { gte: today, lt: tomorrow } },
        { dueDate: null },
      ],
    },
    orderBy: [{ isCompleted: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(tasks);
});

// PATCH /api/operational/tasks/:id/complete
router.patch('/tasks/:id/complete', async (req: Request, res: Response) => {
  const id          = parseInt(String(req.params['id'] ?? '0'));
  const completedById = req.user!.id;

  const updated = await prisma.task.update({
    where: { id },
    data:  { isCompleted: true, completedById, completedAt: new Date() },
  });
  res.json({ message: 'Task marked complete.', task: updated });
});

// PATCH /api/operational/tasks/:id/undo
router.patch('/tasks/:id/undo', async (req: Request, res: Response) => {
  const id = parseInt(String(req.params['id'] ?? '0'));
  const updated = await prisma.task.update({
    where: { id },
    data:  { isCompleted: false, completedById: null, completedAt: null },
  });
  res.json({ message: 'Task reopened.', task: updated });
});

// ── COMPLIANCE ────────────────────────────────────────────────────────────────

// GET /api/operational/compliance
router.get('/compliance', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId;
  if (!branchId) { res.status(400).json({ error: 'No branch assigned.' }); return; }

  const records = await prisma.complianceRecord.findMany({
    where:   { branchId },
    orderBy: { recordedAt: 'desc' },
    take:    50,
  });
  res.json(records);
});

// POST /api/operational/compliance
router.post('/compliance', async (req: Request, res: Response) => {
  const branchId    = req.user!.branchId;
  const recordedById = req.user!.id;

  if (!branchId) { res.status(400).json({ error: 'No branch assigned.' }); return; }

  const { type, description, result, recordedAt } = req.body as {
    type: string; description: string; result?: string; recordedAt?: string;
  };

  const validTypes = ['FOOD_SAFETY', 'ALLERGEN', 'TEMPERATURE_LOG', 'HYGIENE_AUDIT'];
  if (!type || !validTypes.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    return;
  }
  if (!description) {
    res.status(400).json({ error: 'description is required.' });
    return;
  }

  const record = await prisma.complianceRecord.create({
    data: {
      branchId,
      recordedById,
      type:        type as 'FOOD_SAFETY' | 'ALLERGEN' | 'TEMPERATURE_LOG' | 'HYGIENE_AUDIT',
      description,
      result,
      recordedAt:  recordedAt ? new Date(recordedAt) : new Date(),
    },
  });
  res.status(201).json({ message: 'Compliance record saved.', record });
});

export default router;
