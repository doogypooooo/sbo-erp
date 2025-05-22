import { sqliteTable, text, integer, real, unique, primaryKey } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from 'drizzle-orm';

// Enum 타입 정의
export const UserRoleEnum = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff'
} as const;

export const TransactionTypeEnum = {
  PURCHASE: 'purchase',
  SALE: 'sale'
} as const;

export const TransactionStatusEnum = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  PARTIAL: 'partial',
  UNPAID: 'unpaid'
} as const;

export const VoucherTypeEnum = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer'
} as const;

export const VoucherStatusEnum = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  CANCELED: 'canceled'
} as const;

export const PartnerTypeEnum = {
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
  BOTH: 'both'
} as const;

// 사용자 테이블
export const users = sqliteTable('users', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  role: text('role').notNull().default(UserRoleEnum.STAFF),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLogin: text('last_login'),
  preferences: text('preferences'), // JSON 문자열로 저장 (테마, 언어 등)
  createdAt: text('created_at').default("CURRENT_TIMESTAMP")
});

// 사용자 권한 테이블
export const permissions = sqliteTable('permissions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id', { mode: 'number' }).notNull().references(() => users.id),
  resource: text('resource').notNull(), // 리소스명 (메뉴, 페이지)
  canRead: integer('can_read', { mode: 'boolean' }).notNull().default(true),
  canWrite: integer('can_write', { mode: 'boolean' }).notNull().default(false),
  canDelete: integer('can_delete', { mode: 'boolean' }).notNull().default(false),
  canExport: integer('can_export', { mode: 'boolean' }).notNull().default(false)
}, (table) => {
  return {
    unq: unique().on(table.userId, table.resource)
  };
});

// 거래처 테이블
export const partners = sqliteTable('partners', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  businessNumber: text('business_number'),
  type: text('type').notNull(), // customer, supplier, both
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  creditLimit: real('credit_limit').default(0),
  notes: text('notes'),
  createdAt: text('created_at').default("CURRENT_TIMESTAMP"),
  createdBy: integer('created_by', { mode: 'number' }).references(() => users.id)
});

// 품목 분류 테이블 (자기참조)
let _categories: any;
_categories = sqliteTable('categories', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  parentId: integer('parent_id', { mode: 'number' }).references(() => _categories.id),
  level: integer('level', { mode: 'number' }).notNull().default(1), // 1: 대분류, 2: 중분류, 3: 소분류
  createdAt: text('created_at').default("CURRENT_TIMESTAMP") // ISO date string
});
export const categories = _categories;

// 품목 테이블
export const items = sqliteTable('items', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  categoryId: integer('category_id', { mode: 'number' }).references(() => categories.id),
  unitPrice: real('unit_price').notNull().default(0),
  costPrice: real('cost_price').notNull().default(0),
  unit: text('unit'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  minStockLevel: integer('min_stock_level', { mode: 'number' }).default(0),
  image: text('image'), // 이미지 URL 또는 파일 경로
  notes: text('notes'),
  createdAt: text('created_at').default("CURRENT_TIMESTAMP"),
  createdBy: integer('created_by', { mode: 'number' }).references(() => users.id)
});

// 바코드 테이블
export const barcodes = sqliteTable('barcodes', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  itemId: integer('item_id', { mode: 'number' }).notNull().references(() => items.id),
  barcode: text('barcode').notNull().unique(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default("CURRENT_TIMESTAMP")
});

// 재고 테이블
export const inventory = sqliteTable('inventory', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  itemId: integer('item_id', { mode: 'number' }).notNull().references(() => items.id),
  quantity: integer('quantity', { mode: 'number' }).notNull().default(0),
  updatedAt: text('updated_at').default("CURRENT_TIMESTAMP")
}, (table) => {
  return {
    unq: unique().on(table.itemId)
  };
});

// 재고 이력 테이블
export const inventoryHistory = sqliteTable('inventory_history', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  itemId: integer('item_id', { mode: 'number' }).notNull().references(() => items.id),
  transactionType: text('transaction_type').notNull(), // purchase, sale, adjustment
  transactionId: integer('transaction_id', { mode: 'number' }), // 거래 ID (구매 또는 판매)
  quantityBefore: integer('quantity_before', { mode: 'number' }).notNull(),
  quantityAfter: integer('quantity_after', { mode: 'number' }).notNull(),
  change: integer('change', { mode: 'number' }).notNull(), // 변화량 (+/-)
  notes: text('notes'),
  createdAt: text('created_at').default("CURRENT_TIMESTAMP"),
  createdBy: integer('created_by', { mode: 'number' }).references(() => users.id)
});

// 거래 테이블 (구매/판매)
export const transactions = sqliteTable('transactions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // 거래 코드 (자동 생성)
  type: text('type').notNull(), // purchase, sale
  partnerId: integer('partner_id', { mode: 'number' }).notNull().references(() => partners.id),
  date: text('date').notNull(),
  status: text('status').notNull().default(TransactionStatusEnum.PENDING),
  totalAmount: real('total_amount').notNull().default(0),
  taxAmount: real('tax_amount').default(0),
  notes: text('notes'),
  createdAt: text('created_at').default("CURRENT_TIMESTAMP"),
  createdBy: integer('created_by', { mode: 'number' }).references(() => users.id)
});

// 거래 상세 테이블
export const transactionItems = sqliteTable('transaction_items', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  transactionId: integer('transaction_id', { mode: 'number' }).notNull().references(() => transactions.id),
  itemId: integer('item_id', { mode: 'number' }).notNull().references(() => items.id),
  quantity: integer('quantity', { mode: 'number' }).notNull(),
  unitPrice: real('unit_price').notNull(),
  amount: real('amount').notNull(),
  taxAmount: real('tax_amount').default(0)
});

// 계정과목 테이블
export const accounts = sqliteTable('accounts', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull(), // asset, liability, equity, revenue, expense
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default("CURRENT_TIMESTAMP")
});

// 회계 전표 테이블
export const vouchers = sqliteTable('vouchers', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  date: text('date').notNull(),
  type: text('type').notNull(), // income, expense, transfer
  partnerId: integer('partner_id', { mode: 'number' }).references(() => partners.id),
  amount: real('amount').notNull(),
  status: text('status').notNull().default(VoucherStatusEnum.DRAFT),
  description: text('description'),
  createdAt: text('created_at').default("CURRENT_TIMESTAMP"),
  createdBy: integer('created_by', { mode: 'number' }).references(() => users.id)
});

// 전표 상세 테이블
export const voucherItems = sqliteTable('voucher_items', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  voucherId: integer('voucher_id', { mode: 'number' }).notNull().references(() => vouchers.id),
  accountId: integer('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  amount: real('amount').notNull(),
  description: text('description')
});

// 수금/지급 관리 테이블
export const payments = sqliteTable('payments', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  reference: text('reference'),
  transactionId: integer('transaction_id', { mode: 'number' }).references(() => transactions.id),
  voucherId: integer('voucher_id', { mode: 'number' }).references(() => vouchers.id),
  partnerId: integer('partner_id', { mode: 'number' }).notNull().references(() => partners.id),
  date: text('date').notNull(),
  amount: real('amount').notNull(),
  method: text('method').notNull(), // cash, bank, card
  status: text('status').notNull(), // planned, completed
  description: text('description'),
  createdAt: text('created_at').default("CURRENT_TIMESTAMP"),
  createdBy: integer('created_by', { mode: 'number' }).references(() => users.id)
});

// 세금계산서 테이블
export const taxInvoices = sqliteTable('tax_invoices', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  transactionId: integer('transaction_id', { mode: 'number' }).references(() => transactions.id),
  code: text('code').notNull().unique(),
  partnerId: integer('partner_id', { mode: 'number' }).notNull().references(() => partners.id),
  date: text('date').notNull(),
  type: text('type').notNull(), // issue, receive
  netAmount: real('net_amount').notNull(),
  taxAmount: real('tax_amount').notNull(),
  totalAmount: real('total_amount').notNull(),
  status: text('status').notNull(), // issued, canceled
  createdAt: text('created_at').default("CURRENT_TIMESTAMP"),
  createdBy: integer('created_by', { mode: 'number' }).references(() => users.id)
});

// 환경설정 테이블 (key-value, value는 JSON)
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(), // 예: 'company', 'theme', ...
  value: text('value').notNull(), // JSON 문자열
  updatedAt: text('updated_at').default("CURRENT_TIMESTAMP")
});

// 공급자(회사) 정보 스키마 및 타입
export const companyInfoSchema = z.object({
  businessNumber: z.string(),
  name: z.string(),
  contactName: z.string(),
  address: z.string(),
  type: z.string(),
  category: z.string()
});
export type CompanyInfo = z.infer<typeof companyInfoSchema>;

// Zod 스키마 생성
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true
});

export const insertPermissionSchema = createInsertSchema(permissions).pick({
  userId: true,
  resource: true,
  canRead: true,
  canWrite: true,
  canDelete: true,
  canExport: true
});

export const insertPartnerSchema = createInsertSchema(partners).pick({
  name: true,
  businessNumber: true,
  type: true,
  contactName: true,
  phone: true,
  email: true,
  address: true,
  isActive: true,
  creditLimit: true,
  notes: true,
  createdBy: true
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  parentId: true,
  level: true
});

export const insertItemSchema = createInsertSchema(items).pick({
  code: true,
  name: true,
  description: true,
  categoryId: true,
  unitPrice: true,
  costPrice: true,
  unit: true,
  isActive: true,
  minStockLevel: true,
  image: true,
  notes: true,
  createdBy: true
});

export const insertBarcodeSchema = createInsertSchema(barcodes).pick({
  itemId: true,
  barcode: true,
  isActive: true
});

export const insertInventorySchema = createInsertSchema(inventory).pick({
  itemId: true,
  quantity: true
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  code: true,
  type: true,
  partnerId: true,
  date: true,
  status: true,
  totalAmount: true,
  taxAmount: true,
  notes: true,
  createdBy: true
});

export const insertTransactionItemSchema = createInsertSchema(transactionItems).pick({
  transactionId: true,
  itemId: true,
  quantity: true,
  unitPrice: true,
  amount: true,
  taxAmount: true
});

export const insertAccountSchema = createInsertSchema(accounts).pick({
  code: true,
  name: true,
  type: true,
  isActive: true
});

export const insertVoucherSchema = createInsertSchema(vouchers).pick({
  code: true,
  date: true,
  type: true,
  partnerId: true,
  amount: true,
  status: true,
  description: true,
  createdBy: true
});

export const insertVoucherItemSchema = createInsertSchema(voucherItems).pick({
  voucherId: true,
  accountId: true,
  amount: true,
  description: true
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  code: true,
  reference: true,
  transactionId: true,
  voucherId: true,
  partnerId: true,
  date: true,
  amount: true,
  method: true,
  status: true,
  description: true,
  createdBy: true
});

export const insertTaxInvoiceSchema = createInsertSchema(taxInvoices).pick({
  transactionId: true,
  code: true,
  partnerId: true,
  date: true,
  type: true,
  netAmount: true,
  taxAmount: true,
  totalAmount: true,
  status: true,
  createdBy: true
});

// 사용자 활동 로그 테이블
export const userActivities = sqliteTable('user_activities', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id', { mode: 'number' }).references(() => users.id),
  action: text('action').notNull(), // ex: 'create', 'update', 'login', 'permission_change'
  target: text('target'), // ex: '사용자 홍길동', '권한 변경'
  description: text('description'),
  createdAt: text('created_at').default("CURRENT_TIMESTAMP"),
});

// 시스템 알림 테이블
export const notifications = sqliteTable('notifications', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id', { mode: 'number' }).references(() => users.id),
  type: text('type').notNull(), // 'stock_low', 'unpaid', 'system_error', 'db'
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default("CURRENT_TIMESTAMP"),
});

export type Notification = typeof notifications.$inferSelect;

// 유저별 알림 설정 테이블
export const userNotificationSettings = sqliteTable('user_notification_settings', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id', { mode: 'number' }).references(() => users.id),
  type: text('type').notNull(), // 알림 종류
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
});

export type UserNotificationSetting = typeof userNotificationSettings.$inferSelect;

// 타입 정의
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type Barcode = typeof barcodes.$inferSelect;
export type InsertBarcode = z.infer<typeof insertBarcodeSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type InventoryHistory = typeof inventoryHistory.$inferSelect;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type TransactionItem = typeof transactionItems.$inferSelect;
export type InsertTransactionItem = z.infer<typeof insertTransactionItemSchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;

export type VoucherItem = typeof voucherItems.$inferSelect;
export type InsertVoucherItem = z.infer<typeof insertVoucherItemSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type TaxInvoice = typeof taxInvoices.$inferSelect;
export type InsertTaxInvoice = z.infer<typeof insertTaxInvoiceSchema>;

export type UserActivity = typeof userActivities.$inferSelect;

export const scheduledTasks = sqliteTable('scheduled_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  description: text('description').notNull(),
  createdAt: text('created_at').default("CURRENT_TIMESTAMP"), // Add timestamp for creation  
  dueDate: text('due_date').default("CURRENT_TIMESTAMP") // ISO date string for the scheduled date (optional)
});

export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type NewScheduledTask = typeof scheduledTasks.$inferInsert;
