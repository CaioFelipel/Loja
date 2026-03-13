import 'dotenv/config';
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

let _prisma: PrismaClient | null = null;
function getPrisma() {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-lash-key';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());
  app.use(cookieParser());

  // --- Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearerToken || req.cookies.token;
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
    await getPrisma().auditLog.create({
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

      const user = await getPrisma().user.findUnique({ where: { email: result.data.email } });
      if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

      const valid = await bcrypt.compare(result.data.pin, user.pin);
      if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '12h' });
      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
      res.cookie('token', token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        maxAge: 12 * 60 * 60 * 1000,
      });
      
      await audit(user.id, 'LOGIN', 'USER');
      res.json({
        user: { id: user.id, email: user.email, role: user.role, name: user.name },
        token,
      });
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
    try {
      const products = await getPrisma().product.findMany({ orderBy: { name: 'asc' } });
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/reports/export/products', authenticate, async (req, res) => {
    try {
      const products = await getPrisma().product.findMany({ orderBy: { name: 'asc' } });
      let csv = '\uFEFFSKU;Nome;Categoria;Marca;Preço Venda;Preço Custo;Estoque;Estoque Min;Unidade\n';
      products.forEach(p => {
        csv += `${p.sku};${p.name};${p.category};${p.brand || ''};${p.price.toFixed(2).replace('.', ',')};${p.costPrice.toFixed(2).replace('.', ',')};${p.stock};${p.minStock};${p.unit}\n`;
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=produtos.csv');
      res.status(200).send(csv);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/products', authenticate, async (req: any, res) => {
    try {
      const result = ProductSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues });

      const product = await getPrisma().product.create({ 
        data: {
          ...result.data,
          expiryDate: result.data.expiryDate ? new Date(result.data.expiryDate) : null,
        } as any
      });
      await audit(req.user.id, 'CREATE', 'PRODUCT', product);
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/products/:id', authenticate, async (req: any, res) => {
    try {
      const result = ProductSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues });

      const product = await getPrisma().product.update({ 
        where: { id: req.params.id }, 
        data: {
          ...result.data,
          expiryDate: result.data.expiryDate ? new Date(result.data.expiryDate) : null,
        } as any
      });
      await audit(req.user.id, 'UPDATE', 'PRODUCT', product);
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/products/:id/history', authenticate, async (req, res) => {
    try {
      const history = await getPrisma().stockMovement.findMany({
        where: { productId: req.params.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Customer Routes ---
  app.get('/api/customers', authenticate, async (req, res) => {
    try {
      const customers = await getPrisma().customer.findMany({ orderBy: { name: 'asc' } });
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/reports/export/customers', authenticate, async (req, res) => {
    try {
      const customers = await getPrisma().customer.findMany({ orderBy: { name: 'asc' } });
      let csv = '\uFEFFCodigo;Nome;Telefone;Email;Endereco\n';
      customers.forEach(c => {
        csv += `${c.code || ''};${c.name};${c.phone || ''};${c.email || ''};${c.address || ''}\n`;
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=clientes.csv');
      res.status(200).send(csv);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/customers', authenticate, async (req: any, res) => {
    try {
      const result = CustomerSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues });

      const customer = await getPrisma().customer.create({ data: result.data as any });
      await audit(req.user.id, 'CREATE', 'CUSTOMER', customer);
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Cashier Routes ---
  app.get('/api/cashier/session', authenticate, async (req: any, res) => {
    try {
      const session = await getPrisma().cashierSession.findFirst({
        where: { status: 'OPEN' },
        include: { user: true }
      });
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/cashier/open', authenticate, async (req: any, res) => {
    try {
      const result = CashierOpenSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues });

      const active = await getPrisma().cashierSession.findFirst({ where: { status: 'OPEN' } });
      if (active) return res.status(400).json({ error: 'Já existe um caixa aberto' });

      const session = await getPrisma().cashierSession.create({
        data: {
          userId: req.user.id,
          openingBalance: result.data.openingBalance,
          status: 'OPEN',
        }
      });
      await audit(req.user.id, 'OPEN_CASHIER', 'CASHIER_SESSION', session);
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/cashier/close', authenticate, async (req: any, res) => {
    try {
      const session = await getPrisma().cashierSession.findFirst({ where: { status: 'OPEN' } });
      if (!session) return res.status(400).json({ error: 'Nenhum caixa aberto' });

      const closed = await getPrisma().cashierSession.update({
        where: { id: session.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closingBalance: (session.openingBalance || 0) + (session.totalSales || 0) + (session.totalSuprimento || 0) - (session.totalSangria || 0)
        }
      });
      await audit(req.user.id, 'CLOSE_CASHIER', 'CASHIER_SESSION', closed);
      res.json(closed);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/cashier/transaction', authenticate, async (req: any, res) => {
    try {
      const result = CashierTransactionSchema.extend({ type: z.enum(['SUPRIMENTO', 'SANGRIA']) }).safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues });

      const session = await getPrisma().cashierSession.findFirst({ where: { status: 'OPEN' } });
      if (!session) return res.status(400).json({ error: 'Caixa fechado' });

      const transaction = await getPrisma().cashierTransaction.create({
        data: {
          sessionId: session.id,
          type: result.data.type,
          amount: result.data.amount,
          reason: result.data.reason,
        }
      });

      if (result.data.type === 'SUPRIMENTO') {
        await getPrisma().cashierSession.update({ where: { id: session.id }, data: { totalSuprimento: { increment: result.data.amount } } });
      } else {
        await getPrisma().cashierSession.update({ where: { id: session.id }, data: { totalSangria: { increment: result.data.amount } } });
      }

      await audit(req.user.id, result.data.type, 'CASHIER_TRANSACTION', transaction);
      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Sale Routes ---
  app.post('/api/sales', authenticate, async (req: any, res) => {
    try {
      const result = SaleSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues });

      const session = await getPrisma().cashierSession.findFirst({ where: { status: 'OPEN' } });
      if (!session) return res.status(400).json({ error: 'Caixa fechado. Abra o caixa para vender.' });

      const sale = await getPrisma().$transaction(async (tx) => {
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/sales', authenticate, async (req, res) => {
    try {
      const sales = await getPrisma().sale.findMany({
        include: { items: { include: { product: true } }, customer: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(sales);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/reports/export/sales', authenticate, async (req, res) => {
    try {
      const sales = await getPrisma().sale.findMany({
        include: { customer: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
      });

      let csv = '\uFEFFID;Data;Cliente;Total;Desconto;Frete;Metodo Pagamento;Status;Itens\n';
      sales.forEach(sale => {
        const items = sale.items.map(i => `${i.product.name} (x${i.quantity})`).join(' | ');
        const date = new Date(sale.createdAt).toLocaleString('pt-BR');
        csv += `${sale.id};${date};${sale.customer?.name || 'Consumidor'};${sale.total.toFixed(2).replace('.', ',')};${sale.discount.toFixed(2).replace('.', ',')};${sale.shipping.toFixed(2).replace('.', ',')};${sale.paymentMethod};${sale.status};"${items}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=vendas.csv');
      res.status(200).send(csv);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/sales/:id/void', authenticate, async (req: any, res) => {
    try {
      const sale = await getPrisma().sale.findUnique({
        where: { id: req.params.id },
        include: { items: true, session: true }
      });

      if (!sale) return res.status(404).json({ error: 'Venda não encontrada' });
      if (sale.status === 'VOIDED') return res.status(400).json({ error: 'Venda já estornada' });

      const voidedSale = await getPrisma().$transaction(async (tx) => {
        // Update sale status
        const updatedSale = await tx.sale.update({
          where: { id: sale.id },
          data: { status: 'VOIDED' }
        });

        // Restore stock
        for (const item of sale.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'ENTRADA_ESTORNO',
              quantity: item.quantity,
              reason: `Estorno da Venda #${sale.id}`,
            }
          });
        }

        // Update session total
        const sessionUpdateData: any = {
          totalSales: { decrement: sale.total }
        };

        // If session is closed, also update the closing balance to keep it consistent
        if (sale.session.status === 'CLOSED' && sale.session.closingBalance !== null) {
          sessionUpdateData.closingBalance = { decrement: sale.total };
        }

        await tx.cashierSession.update({
          where: { id: sale.sessionId },
          data: sessionUpdateData
        });

        return updatedSale;
      });

      await audit(req.user.id, 'VOID_SALE', 'SALE', voidedSale);
      res.json(voidedSale);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Accounts Payable ---
  app.get('/api/accounts-payable', authenticate, async (req, res) => {
    try {
      const accounts = await getPrisma().accountsPayable.findMany({ orderBy: { dueDate: 'asc' } });
      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/accounts-payable', authenticate, async (req: any, res) => {
    try {
      const result = AccountsPayableSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues });

      const account = await getPrisma().accountsPayable.create({
        data: {
          ...result.data,
          dueDate: new Date(result.data.dueDate),
        } as any
      });
      await audit(req.user.id, 'CREATE', 'ACCOUNTS_PAYABLE', account);
      res.json(account);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/accounts-payable/:id/pay', authenticate, async (req: any, res) => {
    try {
      const { fromCashier } = req.body;
      const account = await getPrisma().accountsPayable.findUnique({ where: { id: req.params.id } });
      if (!account) return res.status(404).json({ error: 'Conta não encontrada' });

      if (fromCashier) {
        const session = await getPrisma().cashierSession.findFirst({ where: { status: 'OPEN' } });
        if (!session) return res.status(400).json({ error: 'Caixa fechado. Não é possível pagar pelo caixa.' });

        await getPrisma().cashierTransaction.create({
          data: {
            sessionId: session.id,
            type: 'SANGRIA',
            amount: account.amount,
            reason: `Pagamento: ${account.description}`,
          }
        });
        await getPrisma().cashierSession.update({
          where: { id: session.id },
          data: { totalSangria: { increment: account.amount } }
        });
      }

      const updated = await getPrisma().accountsPayable.update({
        where: { id: req.params.id },
        data: { status: 'PAID', paidAt: new Date() }
      });
      await audit(req.user.id, 'PAY', 'ACCOUNTS_PAYABLE', updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Audit Logs ---
  app.get('/api/audit-logs', authenticate, async (req, res) => {
    try {
      const logs = await getPrisma().auditLog.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/db-maintenance', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    try {
      // PostgreSQL maintenance commands
      await getPrisma().$executeRawUnsafe('ANALYZE');
      res.json({ message: 'Manutenção concluída com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Reports ---
  app.get('/api/reports/dashboard', authenticate, async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const salesToday = await getPrisma().sale.aggregate({
        where: { 
          createdAt: { gte: today },
          status: { not: 'VOIDED' }
        },
        _sum: { total: true },
        _count: true
      });

      const lowStock = await getPrisma().product.count({
        where: { stock: { lte: getPrisma().product.fields.minStock } }
      });

      const pendingPayables = await getPrisma().accountsPayable.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true }
      });

      const salesByCategory = await getPrisma().saleItem.groupBy({
        by: ['productId'],
        where: { sale: { status: { not: 'VOIDED' } } },
        _sum: { quantity: true, price: true },
      });

      // Get product categories for the grouped items
      const products = await getPrisma().product.findMany({
        select: { id: true, category: true }
      });

      const categoryStats: Record<string, number> = {};
      salesByCategory.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          categoryStats[product.category] = (categoryStats[product.category] || 0) + (item._sum.price || 0);
        }
      });

      const salesByPayment = await getPrisma().sale.groupBy({
        by: ['paymentMethod'],
        where: { status: { not: 'VOIDED' } },
        _sum: { total: true },
        _count: true
      });

      res.json({
        salesToday: salesToday._sum.total || 0,
        salesCountToday: salesToday._count || 0,
        lowStockCount: lowStock,
        pendingPayables: pendingPayables._sum.amount || 0,
        categoryStats,
        salesByPayment
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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
