import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { LoginSchema, ProductSchema, CustomerSchema, CashierOpenSchema, CashierTransactionSchema, SaleSchema, AccountsPayableSchema } from './src/shared/schemas';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-lash-key';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());
  app.use(cookieParser());

  // --- Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Não autorizado' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: 'Token inválido' });
    }
  };

  const audit = async (userId: string | undefined, action: string, resource: string, details?: any) => {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        details: details ? JSON.stringify(details) : null,
      },
    });
  };

  // --- Auth Routes ---
  app.post('/api/auth/login', async (req, res) => {
    try {
      const result = LoginSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues });

      const user = await prisma.user.findUnique({ where: { email: result.data.email } });
      if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

      const valid = await bcrypt.compare(result.data.pin, user.pin);
      if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '12h' });
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      
      await audit(user.id, 'LOGIN', 'USER');
      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro interno no servidor: ' + error.message });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout realizado' });
  });

  app.get('/api/auth/me', authenticate, (req: any, res) => {
    res.json({ user: req.user });
  });

  // --- Product Routes ---
  app.get('/api/products', authenticate, async (req, res) => {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    res.json(products);
  });

  app.post('/api/products', authenticate, async (req: any, res) => {
    const result = ProductSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.issues });

    const product = await prisma.product.create({ 
      data: {
        ...result.data,
        expiryDate: result.data.expiryDate ? new Date(result.data.expiryDate) : null,
      } as any
    });
    await audit(req.user.id, 'CREATE', 'PRODUCT', product);
    res.json(product);
  });

  app.put('/api/products/:id', authenticate, async (req: any, res) => {
    const result = ProductSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.issues });

    const product = await prisma.product.update({ 
      where: { id: req.params.id }, 
      data: {
        ...result.data,
        expiryDate: result.data.expiryDate ? new Date(result.data.expiryDate) : null,
      } as any
    });
    await audit(req.user.id, 'UPDATE', 'PRODUCT', product);
    res.json(product);
  });

  // --- Customer Routes ---
  app.get('/api/customers', authenticate, async (req, res) => {
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
    res.json(customers);
  });

  app.post('/api/customers', authenticate, async (req: any, res) => {
    const result = CustomerSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.issues });

    const customer = await prisma.customer.create({ data: result.data as any });
    await audit(req.user.id, 'CREATE', 'CUSTOMER', customer);
    res.json(customer);
  });

  // --- Cashier Routes ---
  app.get('/api/cashier/session', authenticate, async (req: any, res) => {
    const session = await prisma.cashierSession.findFirst({
      where: { status: 'OPEN' },
      include: { user: true }
    });
    res.json(session);
  });

  app.post('/api/cashier/open', authenticate, async (req: any, res) => {
    const result = CashierOpenSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.issues });

    const active = await prisma.cashierSession.findFirst({ where: { status: 'OPEN' } });
    if (active) return res.status(400).json({ error: 'Já existe um caixa aberto' });

    const session = await prisma.cashierSession.create({
      data: {
        userId: req.user.id,
        openingBalance: result.data.openingBalance,
        status: 'OPEN',
      }
    });
    await audit(req.user.id, 'OPEN_CASHIER', 'CASHIER_SESSION', session);
    res.json(session);
  });

  app.post('/api/cashier/close', authenticate, async (req: any, res) => {
    const session = await prisma.cashierSession.findFirst({ where: { status: 'OPEN' } });
    if (!session) return res.status(400).json({ error: 'Nenhum caixa aberto' });

    const closed = await prisma.cashierSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closingBalance: session.openingBalance + session.totalSales + session.totalSuprimento - session.totalSangria
      }
    });
    await audit(req.user.id, 'CLOSE_CASHIER', 'CASHIER_SESSION', closed);
    res.json(closed);
  });

  app.post('/api/cashier/transaction', authenticate, async (req: any, res) => {
    const result = CashierTransactionSchema.extend({ type: z.enum(['SUPRIMENTO', 'SANGRIA']) }).safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.issues });

    const session = await prisma.cashierSession.findFirst({ where: { status: 'OPEN' } });
    if (!session) return res.status(400).json({ error: 'Caixa fechado' });

    const transaction = await prisma.cashierTransaction.create({
      data: {
        sessionId: session.id,
        type: result.data.type,
        amount: result.data.amount,
        reason: result.data.reason,
      }
    });

    if (result.data.type === 'SUPRIMENTO') {
      await prisma.cashierSession.update({ where: { id: session.id }, data: { totalSuprimento: { increment: result.data.amount } } });
    } else {
      await prisma.cashierSession.update({ where: { id: session.id }, data: { totalSangria: { increment: result.data.amount } } });
    }

    await audit(req.user.id, result.data.type, 'CASHIER_TRANSACTION', transaction);
    res.json(transaction);
  });

  // --- Sale Routes ---
  app.post('/api/sales', authenticate, async (req: any, res) => {
    const result = SaleSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.issues });

    const session = await prisma.cashierSession.findFirst({ where: { status: 'OPEN' } });
    if (!session) return res.status(400).json({ error: 'Caixa fechado. Abra o caixa para vender.' });

    const sale = await prisma.$transaction(async (tx) => {
      const subtotal = result.data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const total = subtotal - result.data.discount + result.data.shipping;

      const newSale = await tx.sale.create({
        data: {
          sessionId: session.id,
          customerId: result.data.customerId,
          total: total,
          discount: result.data.discount,
          shipping: result.data.shipping,
          observation: result.data.observation,
          showObservationOnReceipt: result.data.showObservationOnReceipt,
          paymentMethod: result.data.payments.length > 1 ? 'MULTIPLO' : result.data.payments[0].method,
          items: {
            create: result.data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            }))
          },
          payments: {
            create: result.data.payments.map(p => ({
              method: p.method,
              amount: p.amount,
            }))
          }
        },
        include: { 
          items: { include: { product: true } },
          customer: true 
        }
      });

      // Update stock
      for (const item of result.data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'SAIDA_VENDA',
            quantity: item.quantity,
            reason: `Venda #${newSale.id}`,
          }
        });
      }

      // Update session total
      await tx.cashierSession.update({
        where: { id: session.id },
        data: { totalSales: { increment: newSale.total } }
      });

      return newSale;
    });

    await audit(req.user.id, 'CREATE_SALE', 'SALE', sale);
    res.json(sale);
  });

  app.get('/api/sales', authenticate, async (req, res) => {
    const sales = await prisma.sale.findMany({
      include: { items: { include: { product: true } }, customer: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sales);
  });

  // --- Accounts Payable ---
  app.get('/api/accounts-payable', authenticate, async (req, res) => {
    const accounts = await prisma.accountsPayable.findMany({ orderBy: { dueDate: 'asc' } });
    res.json(accounts);
  });

  app.post('/api/accounts-payable', authenticate, async (req: any, res) => {
    const result = AccountsPayableSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.issues });

    const account = await prisma.accountsPayable.create({
      data: {
        ...result.data,
        dueDate: new Date(result.data.dueDate),
      } as any
    });
    await audit(req.user.id, 'CREATE', 'ACCOUNTS_PAYABLE', account);
    res.json(account);
  });

  app.post('/api/accounts-payable/:id/pay', authenticate, async (req: any, res) => {
    const { fromCashier } = req.body;
    const account = await prisma.accountsPayable.findUnique({ where: { id: req.params.id } });
    if (!account) return res.status(404).json({ error: 'Conta não encontrada' });

    if (fromCashier) {
      const session = await prisma.cashierSession.findFirst({ where: { status: 'OPEN' } });
      if (!session) return res.status(400).json({ error: 'Caixa fechado. Não é possível pagar pelo caixa.' });

      await prisma.cashierTransaction.create({
        data: {
          sessionId: session.id,
          type: 'SANGRIA',
          amount: account.amount,
          reason: `Pagamento: ${account.description}`,
        }
      });
      await prisma.cashierSession.update({
        where: { id: session.id },
        data: { totalSangria: { increment: account.amount } }
      });
    }

    const updated = await prisma.accountsPayable.update({
      where: { id: req.params.id },
      data: { status: 'PAID', paidAt: new Date() }
    });
    await audit(req.user.id, 'PAY', 'ACCOUNTS_PAYABLE', updated);
    res.json(updated);
  });

  // --- Audit Logs ---
  app.get('/api/audit-logs', authenticate, async (req, res) => {
    const logs = await prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(logs);
  });

  // --- Reports ---
  app.get('/api/reports/dashboard', authenticate, async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salesToday = await prisma.sale.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { total: true },
      _count: true
    });

    const lowStock = await prisma.product.count({
      where: { stock: { lte: prisma.product.fields.minStock } }
    });

    const pendingPayables = await prisma.accountsPayable.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true }
    });

    res.json({
      salesToday: salesToday._sum.total || 0,
      salesCountToday: salesToday._count || 0,
      lowStockCount: lowStock,
      pendingPayables: pendingPayables._sum.amount || 0
    });
  });

  // --- Vite Setup ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
