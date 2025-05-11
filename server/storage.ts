import { users, permissions, partners, categories, items, barcodes, inventory, inventoryHistory, transactions, transactionItems, accounts, vouchers, voucherItems, payments, taxInvoices } from "@shared/schema";
import type { 
  User, InsertUser, Permission, InsertPermission, Partner, InsertPartner, 
  Category, InsertCategory, Item, InsertItem, Barcode, InsertBarcode,
  Inventory, InsertInventory, InventoryHistory, Transaction, InsertTransaction,
  TransactionItem, InsertTransactionItem, Account, InsertAccount,
  Voucher, InsertVoucher, VoucherItem, InsertVoucherItem,
  Payment, InsertPayment, TaxInvoice, InsertTaxInvoice
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { log } from "./vite";
import { db } from './db';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, and } from 'drizzle-orm';

const MemoryStore = createMemoryStore(session);

export interface IStorage {


  // 사용자 관리
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserPermissions(userId: number): Promise<Permission[]>;
  setUserPermission(permission: InsertPermission): Promise<Permission>;

  // 거래처 관리
  createPartner(partner: InsertPartner): Promise<Partner>;
  getPartner(id: number): Promise<Partner | undefined>;
  getPartners(type?: string): Promise<Partner[]>;
  updatePartner(id: number, partner: Partial<Partner>): Promise<Partner | undefined>;
  deletePartner(id: number): Promise<boolean>;

  // 품목 관리
  createCategory(category: InsertCategory): Promise<Category>;
  getCategories(): Promise<Category[]>;
  createItem(item: InsertItem): Promise<Item>;
  getItem(id: number): Promise<Item | undefined>;
  getItems(categoryId?: number): Promise<Item[]>;
  updateItem(id: number, item: Partial<Item>): Promise<Item | undefined>;
  deleteItem(id: number): Promise<boolean>;

  // 바코드 관리
  createBarcode(barcode: InsertBarcode): Promise<Barcode>;
  getBarcodesByItem(itemId: number): Promise<Barcode[]>;
  getBarcodeByValue(barcode: string): Promise<(Barcode & { item: Item }) | undefined>;
  deleteBarcode(barcodeId: number): Promise<boolean>;

  // 재고 관리
  getInventory(itemId: number): Promise<Inventory | undefined>;
  updateInventory(itemId: number, quantity: number): Promise<Inventory>;
  getInventoryHistory(itemId?: number): Promise<InventoryHistory[]>;

  // 거래 관리
  createTransaction(transaction: InsertTransaction, items: InsertTransactionItem[]): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionItems(transactionId: number): Promise<TransactionItem[]>;
  getTransactions(type?: string, status?: string): Promise<Transaction[]>;
  updateTransaction(id: number, transaction: Partial<Transaction> & { items?: InsertTransactionItem[] }): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;

  // 회계 관리
  createAccount(account: InsertAccount): Promise<Account>;
  getAccounts(): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  updateAccount(id: number, account: Partial<Account>): Promise<Account | undefined>;

  // 전표 관리
  createVoucher(voucher: InsertVoucher, items: InsertVoucherItem[]): Promise<Voucher>;
  getVoucher(id: number): Promise<Voucher | undefined>;
  getVoucherItems(voucherId: number): Promise<VoucherItem[]>;
  getVouchers(type?: string, status?: string): Promise<Voucher[]>;
  updateVoucher(id: number, voucher: Partial<Voucher> & { items?: InsertVoucherItem[] }): Promise<Voucher | undefined>;

  // 수금/지급 관리
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayments(partnerId?: number): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  updatePayment(id: number, payment: Partial<Payment>): Promise<Payment | undefined>;

  // 세금계산서 관리
  createTaxInvoice(taxInvoice: InsertTaxInvoice): Promise<TaxInvoice>;
  getTaxInvoices(type?: string): Promise<TaxInvoice[]>;
  getTaxInvoice(id: number): Promise<TaxInvoice | undefined>;
  updateTaxInvoice(id: number, taxInvoice: Partial<TaxInvoice>): Promise<TaxInvoice | undefined>;
}

// SQLiteStorage 구현
export class SQLiteStorage implements IStorage {
  private db = db;

  constructor() {
  }

  // 예시: 사용자 관리 (나머지 메서드도 동일하게 구현 필요)
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const inserted = await this.db.insert(users).values(user).returning();
    return inserted[0];
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    await this.db.update(users).set(user).where(eq(users.id, id));
    const updated = await this.getUser(id);
    return updated;
  }

  async getUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async getUserPermissions(userId: number): Promise<Permission[]> {
    return await this.db.select().from(permissions).where(eq(permissions.userId, userId));
  }

  async setUserPermission(permission: InsertPermission): Promise<Permission> {
    // upsert: 이미 있으면 update, 없으면 insert
    const exists = await this.db.select().from(permissions)
      .where(and(eq(permissions.userId, permission.userId), eq(permissions.resource, permission.resource)));
    if (exists.length > 0) {
      await this.db.update(permissions).set(permission)
        .where(and(eq(permissions.userId, permission.userId), eq(permissions.resource, permission.resource)));
      return (await this.db.select().from(permissions)
        .where(and(eq(permissions.userId, permission.userId), eq(permissions.resource, permission.resource))))[0] as Permission;
    } else {
      // @ts-ignore
      const inserted = await this.db.insert(permissions).values(permission).returning() as any[];
      if (!inserted[0]) throw new Error('Permission insert failed');
      return inserted[0];
    }
  }

  // 거래처 관리
  async createPartner(partner: InsertPartner): Promise<Partner> {
    // @ts-ignore
    const inserted = await this.db.insert(partners).values(partner).returning() as any[];
    return inserted[0];
  }

  async getPartner(id: number): Promise<Partner | undefined> {
    const result = await this.db.select().from(partners).where(eq(partners.id, id));
    return result[0];
  }

  async getPartners(type?: string): Promise<Partner[]> {
    if (type) {
      return await this.db.select().from(partners).where(eq(partners.type, type));
    }
    return await this.db.select().from(partners);
  }

  async updatePartner(id: number, partner: Partial<Partner>): Promise<Partner | undefined> {
    await this.db.update(partners).set(partner).where(eq(partners.id, id));
    return await this.getPartner(id);
  }

  async deletePartner(id: number): Promise<boolean> {
    const result = await this.db.delete(partners).where(eq(partners.id, id));
    return result.changes > 0;
  }

  // 품목 관리
  async createCategory(category: InsertCategory): Promise<Category> {
    // @ts-ignore
    const inserted = await this.db.insert(categories).values(category).returning() as any[];
    return inserted[0];
  }

  async getCategories(): Promise<Category[]> {
    return await this.db.select().from(categories);
  }

  async createItem(item: InsertItem): Promise<Item> {
    // @ts-ignore
    const inserted = await this.db.insert(items).values(item).returning() as any[];
    return inserted[0];
  }

  async getItem(id: number): Promise<Item | undefined> {
    const result = await this.db.select().from(items).where(eq(items.id, id));
    return result[0];
  }

  async getItems(categoryId?: number): Promise<Item[]> {
    if (categoryId) {
      return await this.db.select().from(items).where(eq(items.categoryId, categoryId));
    }
    return await this.db.select().from(items);
  }

  async updateItem(id: number, item: Partial<Item>): Promise<Item | undefined> {
    await this.db.update(items).set(item).where(eq(items.id, id));
    return await this.getItem(id);
  }

  async deleteItem(id: number): Promise<boolean> {
    const result = await this.db.delete(items).where(eq(items.id, id));
    return result.changes > 0;
  }

  // 바코드 관리
  async createBarcode(barcode: InsertBarcode): Promise<Barcode> {
    // @ts-ignore
    const inserted = await this.db.insert(barcodes).values(barcode).returning() as any[];
    return inserted[0];
  }

  async getBarcodesByItem(itemId: number): Promise<Barcode[]> {
    return await this.db.select().from(barcodes).where(eq(barcodes.itemId, itemId));
  }

  async getBarcodeByValue(barcode: string): Promise<(Barcode & { item: Item }) | undefined> {
    const result = await this.db.select().from(barcodes).where(eq(barcodes.barcode, barcode));
    if (result.length === 0) return undefined;
    const item = await this.getItem(result[0].itemId);
    if (!item) return undefined;
    return { ...result[0], item };
  }

  async deleteBarcode(barcodeId: number): Promise<boolean> {
    // @ts-ignore
    const result = await this.db.delete(barcodes).where(eq(barcodes.id, barcodeId));
    return result.changes > 0;
  }

  // 재고 관리
  async getInventory(itemId: number): Promise<Inventory | undefined> {
    const result = await this.db.select().from(inventory).where(eq(inventory.itemId, itemId));
    return result[0];
  }

  async updateInventory(itemId: number, quantity: number): Promise<Inventory> {
    const inv = await this.getInventory(itemId);
    if (inv) {
      await this.db.update(inventory).set({ quantity }).where(eq(inventory.itemId, itemId));
      return (await this.getInventory(itemId))!;
    } else {
      await this.db.insert(inventory).values({ itemId, quantity });
      return (await this.getInventory(itemId))!;
    }
  }

  async getInventoryHistory(itemId?: number): Promise<InventoryHistory[]> {
    if (itemId) {
      return await this.db.select().from(inventoryHistory).where(eq(inventoryHistory.itemId, itemId));
    }
    return await this.db.select().from(inventoryHistory);
  }

  // 거래 관리
  async createTransaction(transaction: InsertTransaction, items: InsertTransactionItem[]): Promise<Transaction> {
    return this.db.transaction((tx) => {
      // 판매/출고 재고 체크
      if (transaction.type === 'sale') {
        for (const item of items) {
          const inv = tx.select().from(inventory).where(eq(inventory.itemId, item.itemId)).get();
          const beforeQty = inv?.quantity ?? 0;
          if (Number(item.quantity) > beforeQty) {
            throw new Error(`재고 부족: 품목ID ${item.itemId} (현재 재고: ${beforeQty}, 출고 수량: ${item.quantity})`);
          }
        }
      }
      // 트랜잭션 생성
      const { lastInsertRowid } = tx.insert(transactions).values(transaction).run();
      const transactionId = Number(lastInsertRowid);
      // 트랜잭션 row를 다시 조회
      const txRow = tx.select().from(transactions).where(eq(transactions.id, transactionId)).get();
      for (const item of items) {
        tx.insert(transactionItems).values({ ...item, transactionId }).run();
        // 재고 차감 및 이력 기록 (판매/출고일 때만)
        if (transaction.type === 'sale') {
          // 현재 재고 조회
          const inv = tx.select().from(inventory).where(eq(inventory.itemId, item.itemId)).get();
          const beforeQty = inv?.quantity ?? 0;
          const afterQty = beforeQty - Number(item.quantity);
          // 재고 차감
          if (inv) {
            tx.update(inventory).set({ quantity: afterQty }).where(eq(inventory.itemId, item.itemId)).run();
          } else {
            tx.insert(inventory).values({ itemId: item.itemId, quantity: afterQty }).run();
          }
          // 이력 기록
          tx.insert(inventoryHistory).values({
            itemId: item.itemId,
            transactionType: 'sale',
            transactionId,
            quantityBefore: beforeQty,
            quantityAfter: afterQty,
            change: -Number(item.quantity),
            notes: `판매/출고 등록`,
            createdAt: new Date().toISOString(),
          }).run();
        }
      }
      if (!txRow) throw new Error('Transaction row not found after insert');
      return txRow;
    });
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const result = await this.db.select().from(transactions).where(eq(transactions.id, id));
    return result[0];
  }

  async getTransactionItems(transactionId: number): Promise<TransactionItem[]> {
    return await this.db.select().from(transactionItems).where(eq(transactionItems.transactionId, transactionId));
  }

  async getTransactions(type?: string, status?: string): Promise<Transaction[]> {
    if (type && status) {
      return await this.db.select().from(transactions).where(and(eq(transactions.type, type), eq(transactions.status, status)));
    } else if (type) {
      return await this.db.select().from(transactions).where(eq(transactions.type, type));
    } else if (status) {
      return await this.db.select().from(transactions).where(eq(transactions.status, status));
    }
    return await this.db.select().from(transactions);
  }

  async updateTransaction(id: number, transaction: Partial<Transaction> & { items?: InsertTransactionItem[] }): Promise<Transaction | undefined> {
    return this.db.transaction((tx) => {
      // 기존 거래 및 품목 조회
      const oldTx = tx.select().from(transactions).where(eq(transactions.id, id)).get();
      const oldItems = tx.select().from(transactionItems).where(eq(transactionItems.transactionId, id)).all();
      // 판매/출고 재고 체크 (변화량 기준)
      if ((transaction.type || oldTx?.type) === 'sale') {
        const oldMap = new Map();
        for (const oi of oldItems) oldMap.set(oi.itemId, oi.quantity);
        const newItems = transaction.items || [];
        const newMap = new Map();
        for (const ni of newItems) newMap.set(ni.itemId, ni.quantity);
        const allItemIds = new Set([...Array.from(oldMap.keys()), ...Array.from(newMap.keys())]);
        for (const itemId of Array.from(allItemIds)) {
          const beforeInv = tx.select().from(inventory).where(eq(inventory.itemId, itemId)).get();
          const beforeQty = beforeInv?.quantity ?? 0;
          const oldQty = oldMap.get(itemId) ?? 0;
          const newQty = newMap.get(itemId) ?? 0;
          const diff = newQty - oldQty; // +면 출고 증가, -면 출고 감소(복원)
          if (diff > 0 && diff > beforeQty) {
            throw new Error(`재고 부족: 품목ID ${itemId} (현재 재고: ${beforeQty}, 출고 증가분: ${diff})`);
          }
        }
      }
      // 거래 수정
      tx.update(transactions).set(transaction).where(eq(transactions.id, id)).run();
      // 기존 품목 삭제
      tx.delete(transactionItems).where(eq(transactionItems.transactionId, id)).run();
      // 새 품목 삽입
      const newItems = transaction.items || [];
      for (const item of newItems) {
        tx.insert(transactionItems).values({ ...item, transactionId: id }).run();
      }
      // 재고/이력 처리 (판매/출고)
      if ((transaction.type || oldTx?.type) === 'sale') {
        // 품목별 변화량 계산: (신규 - 기존)
        const oldMap = new Map();
        for (const oi of oldItems) oldMap.set(oi.itemId, oi.quantity);
        const newMap = new Map();
        for (const ni of newItems) newMap.set(ni.itemId, ni.quantity);
        const allItemIds = new Set([...Array.from(oldMap.keys()), ...Array.from(newMap.keys())]);
        for (const itemId of Array.from(allItemIds)) {
          const beforeInv = tx.select().from(inventory).where(eq(inventory.itemId, itemId)).get();
          const beforeQty = beforeInv?.quantity ?? 0;
          const oldQty = oldMap.get(itemId) ?? 0;
          const newQty = newMap.get(itemId) ?? 0;
          const diff = newQty - oldQty; // +면 출고 증가, -면 출고 감소(복원)
          if (diff !== 0) {
            const afterQty = beforeQty - diff;
            if (beforeInv) {
              tx.update(inventory).set({ quantity: afterQty }).where(eq(inventory.itemId, itemId)).run();
            } else {
              tx.insert(inventory).values({ itemId, quantity: afterQty }).run();
            }
            tx.insert(inventoryHistory).values({
              itemId,
              transactionType: 'sale',
              transactionId: id,
              quantityBefore: beforeQty,
              quantityAfter: afterQty,
              change: -diff,
              notes: `판매/출고 수정`,
              createdAt: new Date().toISOString(),
            }).run();
          }
        }
      }
      return tx.select().from(transactions).where(eq(transactions.id, id)).get();
    });
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return this.db.transaction((tx) => {
      // 거래 및 품목 조회
      const txRow = tx.select().from(transactions).where(eq(transactions.id, id)).get();
      const items = tx.select().from(transactionItems).where(eq(transactionItems.transactionId, id)).all();
      // 품목 삭제
      tx.delete(transactionItems).where(eq(transactionItems.transactionId, id)).run();
      // 거래 삭제
      const result = tx.delete(transactions).where(eq(transactions.id, id)).run();
      // 재고/이력 복원 (판매/출고)
      if (txRow?.type === 'sale') {
        for (const item of items) {
          const beforeInv = tx.select().from(inventory).where(eq(inventory.itemId, item.itemId)).get();
          const beforeQty = beforeInv?.quantity ?? 0;
          const afterQty = beforeQty + Number(item.quantity);
          if (beforeInv) {
            tx.update(inventory).set({ quantity: afterQty }).where(eq(inventory.itemId, item.itemId)).run();
          } else {
            tx.insert(inventory).values({ itemId: item.itemId, quantity: afterQty }).run();
          }
          tx.insert(inventoryHistory).values({
            itemId: item.itemId,
            transactionType: 'sale_cancel',
            transactionId: id,
            quantityBefore: beforeQty,
            quantityAfter: afterQty,
            change: Number(item.quantity),
            notes: `판매/출고 취소`,
            createdAt: new Date().toISOString(),
          }).run();
        }
      }
      return result.changes > 0;
    });
  }

  // 회계 관리
  async createAccount(account: InsertAccount): Promise<Account> {
    // @ts-ignore
    const inserted = await this.db.insert(accounts).values(account).returning() as any[];
    return inserted[0];
  }

  async getAccounts(): Promise<Account[]> {
    return await this.db.select().from(accounts);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const result = await this.db.select().from(accounts).where(eq(accounts.id, id));
    return result[0];
  }

  async updateAccount(id: number, account: Partial<Account>): Promise<Account | undefined> {
    await this.db.update(accounts).set(account).where(eq(accounts.id, id));
    return await this.getAccount(id);
  }

  // 전표 관리
  async createVoucher(voucher: InsertVoucher, items: InsertVoucherItem[]): Promise<Voucher> {
    // @ts-ignore
    const inserted = await this.db.insert(vouchers).values(voucher).returning() as any[];
    const v = inserted[0];
    for (const item of items) {
      // @ts-ignore
      await this.db.insert(voucherItems).values({ ...item, voucherId: v.id }).returning();
    }
    return v;
  }

  async getVoucher(id: number): Promise<Voucher | undefined> {
    const result = await this.db.select().from(vouchers).where(eq(vouchers.id, id));
    return result[0];
  }

  async getVoucherItems(voucherId: number): Promise<VoucherItem[]> {
    return await this.db.select().from(voucherItems).where(eq(voucherItems.voucherId, voucherId));
  }

  async getVouchers(type?: string, status?: string): Promise<Voucher[]> {
    if (type && status) {
      return await this.db.select().from(vouchers).where(and(eq(vouchers.type, type), eq(vouchers.status, status)));
    } else if (type) {
      return await this.db.select().from(vouchers).where(eq(vouchers.type, type));
    } else if (status) {
      return await this.db.select().from(vouchers).where(eq(vouchers.status, status));
    }
    return await this.db.select().from(vouchers);
  }

  async updateVoucher(id: number, voucher: Partial<Voucher> & { items?: InsertVoucherItem[] }): Promise<Voucher | undefined> {
    await this.db.update(vouchers).set(voucher).where(eq(vouchers.id, id));
    if (voucher.items) {
      await this.db.delete(voucherItems).where(eq(voucherItems.voucherId, id));
      for (const item of voucher.items) {
        await this.db.insert(voucherItems).values({ ...item, voucherId: id });
      }
    }
    return await this.getVoucher(id);
  }

  // 수금/지급 관리
  async createPayment(payment: InsertPayment): Promise<Payment> {
    // @ts-ignore
    const inserted = await this.db.insert(payments).values(payment).returning() as any[];
    return inserted[0];
  }

  async getPayments(partnerId?: number): Promise<Payment[]> {
    if (partnerId) {
      return await this.db.select().from(payments).where(eq(payments.partnerId, partnerId));
    }
    return await this.db.select().from(payments);
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const result = await this.db.select().from(payments).where(eq(payments.id, id));
    return result[0];
  }

  async updatePayment(id: number, payment: Partial<Payment>): Promise<Payment | undefined> {
    await this.db.update(payments).set(payment).where(eq(payments.id, id));
    return await this.getPayment(id);
  }

  // 세금계산서 관리
  async createTaxInvoice(taxInvoice: InsertTaxInvoice): Promise<TaxInvoice> {
    // @ts-ignore
    const inserted = await this.db.insert(taxInvoices).values(taxInvoice).returning() as any[];
    return inserted[0];
  }

  async getTaxInvoices(type?: string): Promise<TaxInvoice[]> {
    if (type) {
      return await this.db.select().from(taxInvoices).where(eq(taxInvoices.type, type));
    }
    return await this.db.select().from(taxInvoices);
  }

  async getTaxInvoice(id: number): Promise<TaxInvoice | undefined> {
    const result = await this.db.select().from(taxInvoices).where(eq(taxInvoices.id, id));
    return result[0];
  }

  async updateTaxInvoice(id: number, taxInvoice: Partial<TaxInvoice>): Promise<TaxInvoice | undefined> {
    await this.db.update(taxInvoices).set(taxInvoice).where(eq(taxInvoices.id, id));
    return await this.getTaxInvoice(id);
  }
}

// 실제 사용 storage 인스턴스 export (SQLiteStorage 사용)
export const storage = new SQLiteStorage();

// 스토리지 초기화 로그
log("스토리지 서비스가 시작되었습니다");
