import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
const router = Router();
router.use(verifyToken, requireRole(['MANAGEMENT', 'SENIOR', 'ADMIN']));
// ── SALES DASHBOARD ───────────────────────────────────────────────────────────
// GET /api/management/sales?days=30
router.get('/sales', async (req, res) => {
    const role = req.user.role;
    const branchId = req.user.branchId;
    const days = parseInt(String(req.query['days'] ?? '30'));
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    // SENIOR and ADMIN see all branches; MANAGEMENT sees their branch only
    const where = role === 'MANAGEMENT' && branchId
        ? { branchId, date: { gte: from } }
        : { date: { gte: from } };
    const sales = await prisma.dailySale.findMany({
        where,
        include: { branch: { select: { name: true, city: true } } },
        orderBy: [{ date: 'asc' }],
    });
    // Summary stats
    const totalRevenue = sales.reduce((s, r) => s + r.totalRevenue, 0);
    const totalOrders = sales.reduce((s, r) => s + r.orderCount, 0);
    const avgDailyRevenue = sales.length ? totalRevenue / sales.length : 0;
    const avgSpend = totalOrders ? totalRevenue / totalOrders : 0;
    res.json({ sales, summary: { totalRevenue, totalOrders, avgDailyRevenue, avgSpend } });
});
// GET /api/management/sales/by-branch — revenue per branch (last 30d)
router.get('/sales/by-branch', async (req, res) => {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
    const data = await prisma.dailySale.groupBy({
        by: ['branchId'],
        where: { date: { gte: from } },
        _sum: { totalRevenue: true, orderCount: true },
        _avg: { avgSpend: true },
        orderBy: { _sum: { totalRevenue: 'desc' } },
    });
    const branches = await prisma.branch.findMany({
        where: { id: { in: data.map((d) => d.branchId) } },
        select: { id: true, name: true, city: true },
    });
    const result = data.map((d) => ({
        branch: branches.find((b) => b.id === d.branchId),
        totalRevenue: d._sum.totalRevenue ?? 0,
        totalOrders: d._sum.orderCount ?? 0,
        avgSpend: d._avg.avgSpend ?? 0,
    }));
    res.json(result);
});
// ── INVENTORY ─────────────────────────────────────────────────────────────────
// GET /api/management/inventory
router.get('/inventory', async (req, res) => {
    const role = req.user.role;
    const branchId = req.user.branchId;
    const where = role === 'MANAGEMENT' && branchId ? { branchId } : {};
    const items = await prisma.stockItem.findMany({
        where,
        include: { branch: { select: { name: true, city: true } } },
        orderBy: [{ branchId: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    });
    const lowStock = items.filter((i) => i.currentQuantity <= i.reorderThreshold);
    res.json({ items, lowStockCount: lowStock.length });
});
// GET /api/management/inventory/requests
router.get('/inventory/requests', async (req, res) => {
    const role = req.user.role;
    const branchId = req.user.branchId;
    const where = role === 'MANAGEMENT' && branchId
        ? { stockItem: { branchId } }
        : {};
    const requests = await prisma.stockRequest.findMany({
        where,
        include: {
            stockItem: {
                include: { branch: { select: { name: true } } },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
});
// PATCH /api/management/inventory/requests/:id
router.patch('/inventory/requests/:id', async (req, res) => {
    const id = parseInt(String(req.params['id'] ?? '0'));
    const { status } = req.body;
    const validStatuses = ['APPROVED', 'REJECTED', 'FULFILLED'];
    if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
        return;
    }
    const updated = await prisma.stockRequest.update({
        where: { id },
        data: { status: status },
    });
    // If fulfilled, update stock quantity
    if (status === 'FULFILLED') {
        await prisma.stockItem.update({
            where: { id: updated.stockItemId },
            data: { currentQuantity: { increment: updated.quantity } },
        });
        await prisma.stockMovement.create({
            data: {
                stockItemId: updated.stockItemId,
                type: 'IN',
                quantity: updated.quantity,
                notes: `Stock request #${id} fulfilled`,
                createdById: req.user.id,
            },
        });
    }
    res.json({ message: 'Request updated.', request: updated });
});
// PATCH /api/management/inventory/:id/adjust
router.patch('/inventory/:id/adjust', async (req, res) => {
    const id = parseInt(String(req.params['id'] ?? '0'));
    const { quantity, type, notes } = req.body;
    if (!quantity || !type || !['IN', 'OUT'].includes(type)) {
        res.status(400).json({ error: 'quantity and type (IN/OUT) are required.' });
        return;
    }
    const item = await prisma.stockItem.findUnique({ where: { id } });
    if (!item) {
        res.status(404).json({ error: 'Stock item not found.' });
        return;
    }
    const newQty = type === 'IN'
        ? item.currentQuantity + Number(quantity)
        : item.currentQuantity - Number(quantity);
    await prisma.stockItem.update({ where: { id }, data: { currentQuantity: Math.max(0, newQty) } });
    await prisma.stockMovement.create({
        data: { stockItemId: id, type, quantity: Number(quantity), notes, createdById: req.user.id },
    });
    res.json({ message: 'Stock adjusted.' });
});
// ── STAFF ─────────────────────────────────────────────────────────────────────
// GET /api/management/staff
router.get('/staff', async (req, res) => {
    const role = req.user.role;
    const branchId = req.user.branchId;
    const where = role === 'MANAGEMENT' && branchId
        ? { branchId, role: { in: ['OPERATIONAL', 'MANAGEMENT'] } }
        : { role: { in: ['OPERATIONAL', 'MANAGEMENT'] } };
    const staff = await prisma.user.findMany({
        where,
        select: {
            id: true, name: true, email: true, role: true, isActive: true,
            branch: { select: { name: true, city: true } },
        },
        orderBy: [{ branchId: 'asc' }, { name: 'asc' }],
    });
    res.json(staff);
});
// GET /api/management/timesheets
router.get('/timesheets', async (req, res) => {
    const role = req.user.role;
    const branchId = req.user.branchId;
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const where = role === 'MANAGEMENT' && branchId
        ? { branchId, date: { gte: from } }
        : { date: { gte: from } };
    const timesheets = await prisma.timesheet.findMany({
        where,
        include: {
            user: { select: { name: true, role: true } },
            branch: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
    });
    res.json(timesheets);
});
// ── ALERTS ────────────────────────────────────────────────────────────────────
// GET /api/management/alerts
router.get('/alerts', async (req, res) => {
    const role = req.user.role;
    const branchId = req.user.branchId;
    const where = role === 'MANAGEMENT' && branchId
        ? { OR: [{ branchId }, { branchId: null }] }
        : {};
    const alerts = await prisma.alert.findMany({
        where,
        include: { branch: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.json(alerts);
});
// PATCH /api/management/alerts/:id/read
router.patch('/alerts/:id/read', async (req, res) => {
    const id = parseInt(String(req.params['id'] ?? '0'));
    await prisma.alert.update({ where: { id }, data: { status: 'READ' } });
    res.json({ message: 'Alert marked as read.' });
});
// PATCH /api/management/alerts/:id/resolve
router.patch('/alerts/:id/resolve', async (req, res) => {
    const id = parseInt(String(req.params['id'] ?? '0'));
    await prisma.alert.update({ where: { id }, data: { status: 'RESOLVED' } });
    res.json({ message: 'Alert resolved.' });
});
// POST /api/management/alerts — create alert (managers can create)
router.post('/alerts', async (req, res) => {
    const { type, title, message, branchId } = req.body;
    const validTypes = ['LOW_STOCK', 'HIGH_SALES', 'LOW_SALES', 'COMPLIANCE_DUE', 'STAFF_SHORTAGE', 'SYSTEM'];
    if (!type || !validTypes.includes(type) || !title || !message) {
        res.status(400).json({ error: 'type, title and message are required.' });
        return;
    }
    const alert = await prisma.alert.create({
        data: {
            type: type,
            title,
            message,
            branchId: branchId ?? null,
        },
    });
    res.status(201).json({ message: 'Alert created.', alert });
});
// ── TASKS (management can create tasks) ───────────────────────────────────────
// POST /api/management/tasks
router.post('/tasks', async (req, res) => {
    const { branchId: bodyBranchId, title, description, dueDate } = req.body;
    const branchId = bodyBranchId ?? req.user.branchId;
    if (!branchId || !title) {
        res.status(400).json({ error: 'branchId and title are required.' });
        return;
    }
    const task = await prisma.task.create({
        data: { branchId, title, description, dueDate: dueDate ? new Date(dueDate) : null },
    });
    res.status(201).json({ message: 'Task created.', task });
});
// GET /api/management/compliance
router.get('/compliance', async (req, res) => {
    const role = req.user.role;
    const branchId = req.user.branchId;
    const where = role === 'MANAGEMENT' && branchId ? { branchId } : {};
    const records = await prisma.complianceRecord.findMany({
        where,
        include: { branch: { select: { name: true } } },
        orderBy: { recordedAt: 'desc' },
        take: 100,
    });
    res.json(records);
});
export default router;
