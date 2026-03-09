import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Users
  const adminPin = await bcrypt.hash('123456', 10);
  const caixaPin = await bcrypt.hash('1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lashflow.com' },
    update: {},
    create: {
      email: 'admin@lashflow.com',
      name: 'Administrador',
      pin: adminPin,
      role: 'ADMIN',
    },
  });

  const caixa = await prisma.user.upsert({
    where: { email: 'caixa@lashflow.com' },
    update: {},
    create: {
      email: 'caixa@lashflow.com',
      name: 'Operador de Caixa',
      pin: caixaPin,
      role: 'CAIXA',
    },
  });

  // Products
  const products = [
    { sku: 'LASH-001', name: 'Cílios Nagaraku 0.07D Mix', category: 'Cílios', brand: 'Nagaraku', price: 45.0, costPrice: 22.0, stock: 50, minStock: 10 },
    { sku: 'LASH-002', name: 'Cílios Nagaraku 0.05C Mix', category: 'Cílios', brand: 'Nagaraku', price: 45.0, costPrice: 22.0, stock: 30, minStock: 10 },
    { sku: 'GLUE-001', name: 'Cola Sky S+ 5ml', category: 'Colas', brand: 'Sky Glue', price: 120.0, costPrice: 65.0, stock: 15, minStock: 5, expiryDate: new Date('2026-12-31') },
    { sku: 'GLUE-002', name: 'Cola Elite HS-10 3ml', category: 'Colas', brand: 'Elite', price: 95.0, costPrice: 50.0, stock: 10, minStock: 3, expiryDate: new Date('2026-10-15') },
    { sku: 'TWZ-001', name: 'Pinça Reta Vetus ST-11', category: 'Pinças', brand: 'Vetus', price: 35.0, costPrice: 15.0, stock: 20, minStock: 5 },
    { sku: 'TWZ-002', name: 'Pinça Curva Vetus ST-15', category: 'Pinças', brand: 'Vetus', price: 35.0, costPrice: 15.0, stock: 20, minStock: 5 },
    { sku: 'REM-001', name: 'Removedor em Gel Navina', category: 'Removedores', brand: 'Navina', price: 25.0, costPrice: 12.0, stock: 25, minStock: 5 },
    { sku: 'ACC-001', name: 'Escovinhas Descartáveis (50un)', category: 'Acessórios', brand: 'Genérico', price: 15.0, costPrice: 5.0, stock: 100, minStock: 20 },
    { sku: 'ACC-002', name: 'Microbrush (100un)', category: 'Acessórios', brand: 'Genérico', price: 18.0, costPrice: 7.0, stock: 80, minStock: 15 },
    { sku: 'ACC-003', name: 'Patch de Gel (10 pares)', category: 'Acessórios', brand: 'Genérico', price: 20.0, costPrice: 8.0, stock: 60, minStock: 10 },
    { sku: 'LASH-003', name: 'Cílios Decemars 0.07D 12mm', category: 'Cílios', brand: 'Decemars', price: 55.0, costPrice: 28.0, stock: 40, minStock: 10 },
    { sku: 'LASH-004', name: 'Cílios Decemars 0.07D 10mm', category: 'Cílios', brand: 'Decemars', price: 55.0, costPrice: 28.0, stock: 40, minStock: 10 },
    { sku: 'GLUE-003', name: 'Cola Sobelle Power 3ml', category: 'Colas', brand: 'Sobelle', price: 110.0, costPrice: 60.0, stock: 12, minStock: 4, expiryDate: new Date('2026-08-20') },
    { sku: 'ACC-004', name: 'Fita Transpore 3M', category: 'Acessórios', brand: '3M', price: 12.0, costPrice: 4.5, stock: 50, minStock: 10 },
    { sku: 'ACC-005', name: 'Espelho de Precisão', category: 'Acessórios', brand: 'Genérico', price: 28.0, costPrice: 10.0, stock: 15, minStock: 3 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
  }

  // Customers
  const customers = [
    { name: 'Ana Silva', phone: '11999998888', email: 'ana@email.com' },
    { name: 'Beatriz Santos', phone: '11988887777', email: 'bia@email.com' },
    { name: 'Carla Oliveira', phone: '11977776666', email: 'carla@email.com' },
    { name: 'Daniela Lima', phone: '11966665555', email: 'dani@email.com' },
    { name: 'Fernanda Costa', phone: '11955554444', email: 'fer@email.com' },
  ];

  for (const c of customers) {
    await prisma.customer.create({ data: c });
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
