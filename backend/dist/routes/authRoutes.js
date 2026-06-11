import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';
const router = Router();
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] ?? '7d';
// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
    }
    const user = await prisma.user.findUnique({
        where: { email },
        include: { branch: { select: { id: true, name: true, city: true } } },
    });
    if (!user || !user.isActive) {
        res.status(401).json({ error: 'Invalid credentials or account is inactive.' });
        return;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        res.status(401).json({ error: 'Invalid credentials or account is inactive.' });
        return;
    }
    const token = jwt.sign({ id: user.id, role: user.role, branchId: user.branchId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            branchId: user.branchId,
            branch: user.branch,
        },
    });
});
// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true, name: true, email: true, role: true,
            isActive: true, branchId: true,
            branch: { select: { id: true, name: true, city: true } },
        },
    });
    res.json(user);
});
export default router;
