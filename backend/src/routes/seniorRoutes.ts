import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken, requireRole(['SENIOR', 'ADMIN']));

// ── KPI DASHBOARD ─────────────────────────────────────────────────────────────

// GET /api/senior/kpi
router.get('/kpi', async (_req: Request, res: Response) => {
  const now    = new Date();
  const today  = new Date(now); today.setHours(0, 0, 0, 0);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
  const thirtyDaysAgo  = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    thisMonthSales,
    lastMonthSales,
    last30Sales,
    activeBranches,
    totalStaff,
    unreadAlerts,
    lowStockRaw,
  ] = await Promise.all([
    prisma.dailySale.aggregate({
      where: { date: { gte: thisMonthStart } },
      _sum:  { totalRevenue: true, orderCount: true, covers: true },
    }),
    prisma.dailySale.aggregate({
      where: { date: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum:  { totalRevenue: true, orderCount: true },
    }),
    prisma.dailySale.findMany({
      where:   { date: { gte: thirtyDaysAgo } },
      include: { branch: { select: { name: true, city: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.branch.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true, role: { in: ['OPERATIONAL', 'MANAGEMENT'] } } }),
    prisma.alert.count({ where: { status: 'UNREAD' } }),
    prisma.stockItem.findMany({ select: { currentQuantity: true, reorderThreshold: true } }),
  ]);

  const lowStockCount = (lowStockRaw as Array<{ currentQuantity: number; reorderThreshold: number }>)
    .filter((s) => s.currentQuantity <= s.reorderThreshold).length;

  const thisMonthRevenue = thisMonthSales._sum.totalRevenue ?? 0;
  const lastMonthRevenue = lastMonthSales._sum.totalRevenue ?? 0;
  const revenueGrowth    = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  // Revenue by branch (last 30 days)
  const byBranch = await prisma.dailySale.groupBy({
    by:      ['branchId'],
    where:   { date: { gte: thirtyDaysAgo } },
    _sum:    { totalRevenue: true, orderCount: true, covers: true },
    orderBy: { _sum: { totalRevenue: 'desc' } },
  });

  const branches = await prisma.branch.findMany({
    where:  { id: { in: byBranch.map((b) => b.branchId) } },
    select: { id: true, name: true, city: true },
  });

  const branchStats = byBranch.map((b) => ({
    branch:       branches.find((br) => br.id === b.branchId),
    totalRevenue: b._sum.totalRevenue ?? 0,
    totalOrders:  b._sum.orderCount   ?? 0,
    totalCovers:  b._sum.covers        ?? 0,
  }));

  res.json({
    kpis: {
      thisMonthRevenue,
      lastMonthRevenue,
      revenueGrowth:    Math.round(revenueGrowth * 10) / 10,
      thisMonthOrders:  thisMonthSales._sum.orderCount ?? 0,
      thisMonthCovers:  thisMonthSales._sum.covers     ?? 0,
      activeBranches,
      totalStaff,
      unreadAlerts,
    },
    trend:       last30Sales,
    branchStats,
  });
});

// GET /api/senior/analytics — detailed analytics
router.get('/analytics', async (req: Request, res: Response) => {
  const days = parseInt(String(req.query['days'] ?? '90'));
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const [salesTrend, branchComparison, complianceSummary, stockAlerts] = await Promise.all([
    // Daily revenue trend (all branches aggregated)
    prisma.dailySale.groupBy({
      by:      ['date'],
      where:   { date: { gte: from } },
      _sum:    { totalRevenue: true, orderCount: true, covers: true },
      orderBy: { date: 'asc' },
    }),

    // Branch revenue comparison
    prisma.dailySale.groupBy({
      by:      ['branchId'],
      where:   { date: { gte: from } },
      _sum:    { totalRevenue: true, orderCount: true },
      _avg:    { avgSpend: true },
      orderBy: { _sum: { totalRevenue: 'desc' } },
    }),

    // Compliance records by type
    prisma.complianceRecord.groupBy({
      by:      ['type'],
      _count:  { id: true },
    }),

    // Low stock items (all, will filter in JS)
    prisma.stockItem.findMany({
      include: { branch: { select: { name: true } } },
      orderBy: { currentQuantity: 'asc' },
    }),
  ]);

  const branchNames = await prisma.branch.findMany({
    where:  { id: { in: branchComparison.map((b) => b.branchId) } },
    select: { id: true, name: true, city: true },
  });

  const branchData = branchComparison.map((b) => ({
    branch:       branchNames.find((br) => br.id === b.branchId),
    totalRevenue: b._sum.totalRevenue ?? 0,
    totalOrders:  b._sum.orderCount   ?? 0,
    avgSpend:     b._avg.avgSpend      ?? 0,
  }));

  const lowStockAlerts = (stockAlerts as Array<{ currentQuantity: number; reorderThreshold: number } & typeof stockAlerts[0]>)
    .filter((s) => s.currentQuantity <= s.reorderThreshold);

  res.json({
    salesTrend,
    branchComparison: branchData,
    complianceSummary,
    lowStockAlerts,
  });
});

// GET /api/senior/financial — financial summary report
router.get('/financial', async (_req: Request, res: Response) => {
  const now = new Date();

  // Last 12 months revenue
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    months.push({ start, end, label: start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) });
  }

  const monthlyRevenue = await Promise.all(
    months.map(async (m) => {
      const agg = await prisma.dailySale.aggregate({
        where: { date: { gte: m.start, lte: m.end } },
        _sum:  { totalRevenue: true, orderCount: true },
      });
      return {
        month:        m.label,
        totalRevenue: agg._sum.totalRevenue ?? 0,
        totalOrders:  agg._sum.orderCount   ?? 0,
      };
    })
  );

  const totalAnnualRevenue = monthlyRevenue.reduce((s, m) => s + m.totalRevenue, 0);
  const totalAnnualOrders  = monthlyRevenue.reduce((s, m) => s + m.totalOrders,  0);
  const avgMonthlyRevenue  = totalAnnualRevenue / 12;

  // Branch performance YTD
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const ytdByBranch = await prisma.dailySale.groupBy({
    by:      ['branchId'],
    where:   { date: { gte: yearStart } },
    _sum:    { totalRevenue: true, orderCount: true },
    orderBy: { _sum: { totalRevenue: 'desc' } },
  });

  const branches = await prisma.branch.findMany({ select: { id: true, name: true, city: true } });
  const branchYTD = ytdByBranch.map((b) => ({
    branch:       branches.find((br) => br.id === b.branchId),
    ytdRevenue:   b._sum.totalRevenue ?? 0,
    ytdOrders:    b._sum.orderCount   ?? 0,
    revenueShare: totalAnnualRevenue > 0
      ? Math.round(((b._sum.totalRevenue ?? 0) / totalAnnualRevenue) * 1000) / 10
      : 0,
  }));

  res.json({
    monthlyRevenue,
    summary: { totalAnnualRevenue, totalAnnualOrders, avgMonthlyRevenue },
    branchYTD,
  });
});

// GET /api/senior/users — all staff with details
router.get('/users', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where:   { role: { not: 'ADMIN' } },
    select:  {
      id: true, name: true, email: true, role: true, isActive: true,
      branch: { select: { name: true, city: true } },
      createdAt: true,
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
  res.json(users);
});

export default router;
