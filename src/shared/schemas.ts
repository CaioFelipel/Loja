import { z } from 'zod';

// Auth
export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  pin: z.string().min(4, 'PIN deve ter no mínimo 4 dígitos').max(6, 'PIN deve ter no máximo 6 dígitos'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// User
export const UserRole = {
  ADMIN: 'ADMIN',
  CAIXA: 'CAIXA',
} as const;

// Product
export const ProductSchema = z.object({
  sku: z.string().min(1, 'SKU é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().nullable(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  brand: z.string().optional().nullable(),
  price: z.number().min(0, 'Preço deve ser positivo'),
  costPrice: z.number().min(0, 'Preço de custo deve ser positivo'),
  stock: z.number().default(0),
  minStock: z.number().default(0),
  unit: z.string().default('UN'),
  photo: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  batch: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
});

export type ProductInput = z.infer<typeof ProductSchema>;

// Customer
export const CustomerSchema = z.object({
  code: z.string().optional().nullable(),
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
  address: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
});

export type CustomerInput = z.infer<typeof CustomerSchema>;

// Cashier
export const CashierOpenSchema = z.object({
  openingBalance: z.number().min(0, 'Saldo inicial deve ser positivo'),
});

export const CashierTransactionSchema = z.object({
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  reason: z.string().min(1, 'Motivo é obrigatório'),
});

// Sale
export const SaleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  price: z.number(),
});

export const PaymentSchema = z.object({
  method: z.enum(['DINHEIRO', 'PIX', 'CARTAO', 'CARTAO_CREDITO', 'CARTAO_DEBITO']),
  amount: z.number().min(0.01),
});

export const SaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(SaleItemSchema).min(1, 'Pelo menos um item é necessário'),
  payments: z.array(PaymentSchema).min(1, 'Pelo menos um pagamento é necessário'),
  discount: z.number().default(0),
  shipping: z.number().default(0),
  observation: z.string().optional().nullable(),
  showObservationOnReceipt: z.boolean().default(false),
});

export type SaleInput = z.infer<typeof SaleSchema>;

// Accounts Payable
export const AccountsPayableSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  dueDate: z.string(),
  category: z.string().optional(),
});

export type AccountsPayableInput = z.infer<typeof AccountsPayableSchema>;
