import bcrypt from 'bcryptjs';
import prisma from './prisma.js';

export async function seedDatabase(): Promise<void> {
  const adminEmail    = process.env['ADMIN_EMAIL'];
  const adminPassword = process.env['ADMIN_PASSWORD'];

  if (!adminEmail || !adminPassword) {
    console.log('[Seeder] ADMIN_EMAIL or ADMIN_PASSWORD missing — skipping.');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log('[Seeder] Admin already exists — skipping seed.');
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Create admin
  await prisma.user.create({
    data: { name: 'System Admin', email: adminEmail, password: hashedPassword, role: 'ADMIN' },
  });
  console.log(`[Seeder] Admin created: ${adminEmail}`);

  // Seed branches
  const branches = await prisma.branch.createManyAndReturn({
    data: [
      { name: 'Steakz London City',    location: '1 Bishopsgate', city: 'London',     phone: '020 7000 0001' },
      { name: 'Steakz Manchester',     location: '45 Deansgate',  city: 'Manchester',  phone: '0161 000 0002' },
      { name: 'Steakz Birmingham',     location: '12 New Street',  city: 'Birmingham',  phone: '0121 000 0003' },
    ],
  });
  console.log(`[Seeder] ${branches.length} branches created.`);

  const londonBranch = branches[0]!;
  const manchesterBranch = branches[1]!;

  // Seed menu items
  await prisma.menuItem.createMany({
    data: [
      { name: 'Ribeye Steak 10oz',      category: 'Mains',    price: 32.95 },
      { name: 'Fillet Steak 8oz',       category: 'Mains',    price: 38.95 },
      { name: 'Sirloin Steak 12oz',     category: 'Mains',    price: 29.95 },
      { name: 'Burger & Chips',         category: 'Mains',    price: 16.95 },
      { name: 'Grilled Salmon',         category: 'Mains',    price: 22.95 },
      { name: 'Garlic Bread',           category: 'Starters', price:  5.95 },
      { name: 'Soup of the Day',        category: 'Starters', price:  6.95 },
      { name: 'Prawn Cocktail',         category: 'Starters', price:  9.95 },
      { name: 'Chips',                  category: 'Sides',    price:  4.50 },
      { name: 'Onion Rings',            category: 'Sides',    price:  4.50 },
      { name: 'House Salad',            category: 'Sides',    price:  5.50 },
      { name: 'Sticky Toffee Pudding',  category: 'Desserts', price:  7.95 },
      { name: 'Cheesecake',             category: 'Desserts', price:  7.50 },
      { name: 'Soft Drinks',            category: 'Drinks',   price:  3.50 },
      { name: 'House Wine (glass)',     category: 'Drinks',   price:  6.95 },
    ],
  });
  console.log('[Seeder] Menu items created.');

  // Seed stock items for London branch
  await prisma.stockItem.createMany({
    data: [
      { name: 'Ribeye Steak',     category: 'Meat',    unit: 'kg',     currentQuantity: 45,  reorderThreshold: 10, branchId: londonBranch.id },
      { name: 'Fillet Steak',     category: 'Meat',    unit: 'kg',     currentQuantity: 30,  reorderThreshold: 8,  branchId: londonBranch.id },
      { name: 'Sirloin Steak',    category: 'Meat',    unit: 'kg',     currentQuantity: 40,  reorderThreshold: 10, branchId: londonBranch.id },
      { name: 'Salmon Fillet',    category: 'Fish',    unit: 'kg',     currentQuantity: 20,  reorderThreshold: 5,  branchId: londonBranch.id },
      { name: 'Potatoes',         category: 'Veg',     unit: 'kg',     currentQuantity: 80,  reorderThreshold: 20, branchId: londonBranch.id },
      { name: 'Lettuce',          category: 'Veg',     unit: 'heads',  currentQuantity: 7,   reorderThreshold: 10, branchId: londonBranch.id },
      { name: 'Olive Oil',        category: 'Dry',     unit: 'litres', currentQuantity: 12,  reorderThreshold: 3,  branchId: londonBranch.id },
      { name: 'Bread Rolls',      category: 'Bakery',  unit: 'units',  currentQuantity: 60,  reorderThreshold: 20, branchId: londonBranch.id },
      { name: 'Dessert Mix',      category: 'Dry',     unit: 'kg',     currentQuantity: 4,   reorderThreshold: 5,  branchId: londonBranch.id },
    ],
  });

  // Seed stock for Manchester
  await prisma.stockItem.createMany({
    data: [
      { name: 'Ribeye Steak',  category: 'Meat', unit: 'kg',    currentQuantity: 35, reorderThreshold: 10, branchId: manchesterBranch.id },
      { name: 'Sirloin Steak', category: 'Meat', unit: 'kg',    currentQuantity: 28, reorderThreshold: 10, branchId: manchesterBranch.id },
      { name: 'Potatoes',      category: 'Veg',  unit: 'kg',    currentQuantity: 60, reorderThreshold: 20, branchId: manchesterBranch.id },
      { name: 'Lettuce',       category: 'Veg',  unit: 'heads', currentQuantity: 12, reorderThreshold: 10, branchId: manchesterBranch.id },
    ],
  });
  console.log('[Seeder] Stock items created.');

  // Seed staff for London branch
  const pw = await bcrypt.hash('Password1!', 10);
  await prisma.user.createMany({
    data: [
      { name: 'Sarah Mitchell',  email: 'sarah.mitchell@steakz.co.uk',  password: pw, role: 'MANAGEMENT',   branchId: londonBranch.id },
      { name: 'James O\'Brien',  email: 'james.obrien@steakz.co.uk',    password: pw, role: 'OPERATIONAL',  branchId: londonBranch.id },
      { name: 'Priya Sharma',    email: 'priya.sharma@steakz.co.uk',    password: pw, role: 'OPERATIONAL',  branchId: londonBranch.id },
      { name: 'Tom Bennett',     email: 'tom.bennett@steakz.co.uk',     password: pw, role: 'MANAGEMENT',   branchId: manchesterBranch.id },
      { name: 'Liu Wei',         email: 'liu.wei@steakz.co.uk',         password: pw, role: 'OPERATIONAL',  branchId: manchesterBranch.id },
      { name: 'Emma Clarke',     email: 'emma.clarke@steakz.co.uk',     password: pw, role: 'SENIOR',       branchId: null },
    ],
  });
  console.log('[Seeder] Staff created.');

  // Seed daily sales (last 30 days) for London and Manchester
  const today = new Date();
  const salesData = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const londonRevenue = isWeekend
      ? 3800 + Math.random() * 800
      : 2200 + Math.random() * 600;
    const manchesterRevenue = isWeekend
      ? 2900 + Math.random() * 600
      : 1800 + Math.random() * 400;

    salesData.push({
      branchId: londonBranch.id,
      date,
      totalRevenue: Math.round(londonRevenue * 100) / 100,
      orderCount:   Math.round(londonRevenue / 28),
      avgSpend:     Math.round((londonRevenue / (londonRevenue / 28)) * 100) / 100,
      covers:       Math.round(londonRevenue / 14),
    });
    salesData.push({
      branchId: manchesterBranch.id,
      date,
      totalRevenue: Math.round(manchesterRevenue * 100) / 100,
      orderCount:   Math.round(manchesterRevenue / 25),
      avgSpend:     Math.round((manchesterRevenue / (manchesterRevenue / 25)) * 100) / 100,
      covers:       Math.round(manchesterRevenue / 12),
    });
  }
  await prisma.dailySale.createMany({ data: salesData });
  console.log('[Seeder] Sales data created.');

  // Seed tasks for London branch
  await prisma.task.createMany({
    data: [
      { branchId: londonBranch.id, title: 'Morning temperature checks',      description: 'Check fridge/freezer temps and log in compliance system', dueDate: today },
      { branchId: londonBranch.id, title: 'Stock count — dry goods',         description: 'Count all dry goods and update inventory', dueDate: today },
      { branchId: londonBranch.id, title: 'Clean kitchen surfaces',          description: 'Deep clean all prep surfaces with approved sanitiser', dueDate: today },
      { branchId: londonBranch.id, title: 'Check allergen labels',           description: 'Verify all allergen information on menu is current', dueDate: today },
      { branchId: londonBranch.id, title: 'Weekly staff briefing',           description: 'Team briefing at 9am — cover promotions and service standards', isCompleted: true },
    ],
  });

  // Seed compliance records
  await prisma.complianceRecord.createMany({
    data: [
      { branchId: londonBranch.id, type: 'TEMPERATURE_LOG', description: 'Fridge 1: 3°C | Freezer: -18°C | All within safe range', result: 'PASS', recordedById: 1, recordedAt: today },
      { branchId: londonBranch.id, type: 'FOOD_SAFETY',     description: 'Daily food safety check completed — no issues identified', result: 'PASS', recordedById: 1, recordedAt: today },
      { branchId: londonBranch.id, type: 'ALLERGEN',        description: 'Allergen matrix reviewed and confirmed current', result: 'PASS', recordedById: 1, recordedAt: today },
    ],
  });

  // Seed alerts
  await prisma.alert.createMany({
    data: [
      { type: 'LOW_STOCK',      title: 'Low Stock Alert',          message: 'Lettuce stock at London City is below reorder threshold (7 heads remaining)', branchId: londonBranch.id, status: 'UNREAD' },
      { type: 'LOW_STOCK',      title: 'Low Stock Alert',          message: 'Dessert Mix stock at London City is critically low (4 kg remaining)',         branchId: londonBranch.id, status: 'UNREAD' },
      { type: 'COMPLIANCE_DUE', title: 'Compliance Check Due',     message: 'Monthly hygiene audit due for Manchester branch by end of week',               branchId: manchesterBranch.id, status: 'UNREAD' },
      { type: 'SYSTEM',         title: 'System Maintenance',       message: 'Scheduled maintenance window: Sunday 02:00–04:00. Portal may be unavailable.', branchId: null, status: 'READ' },
    ],
  });
  console.log('[Seeder] Tasks, compliance, and alerts created.');
  console.log('[Seeder] Database seeded successfully!');
}
