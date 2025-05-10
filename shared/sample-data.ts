import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import {
  users, permissions, partners, categories, items, barcodes, inventory, accounts,
  UserRoleEnum, PartnerTypeEnum, InsertUser, InsertAccount, InsertPartner, InsertCategory, InsertItem, InsertBarcode, InsertInventory
} from './schema';
import bcrypt from 'bcryptjs';

export async function insertSampleData() {
  const sqlite = new Database('./database/erp.db');
  const db = drizzle(sqlite);

  // 1. 관리자 계정
  const adminUsername = 'admin';
  const adminUser = await db.select().from(users).where(eq(users.username, adminUsername));
  let adminId: number;
  if (adminUser.length === 0) {
    const hashed = await bcrypt.hash('admin123', 10);
    const inserted = await db.insert(users).values({
      username: adminUsername,
      password: hashed,
      name: '관리자',
      email: '',
      role: UserRoleEnum.ADMIN,
      isActive: true
    } as InsertUser).returning({ id: users.id });
    adminId = inserted[0].id;
    console.log('관리자 계정 생성 완료');
  } else {
    adminId = adminUser[0].id;
    console.log('관리자 계정 이미 존재');
  }

  // 2. 계정과목
  const accountsToInsert: InsertAccount[] = [
    { code: '101', name: '현금', type: 'asset', isActive: true },
    { code: '201', name: '매출', type: 'revenue', isActive: true },
    { code: '301', name: '매입', type: 'expense', isActive: true }
  ];
  for (const acc of accountsToInsert) {
    const exists = await db.select().from(accounts).where(eq(accounts.code, acc.code));
    if (exists.length === 0) {
      await db.insert(accounts).values(acc);
      console.log(`계정과목 ${acc.name} 생성 완료`);
    } else {
      console.log(`계정과목 ${acc.name} 이미 존재`);
    }
  }

  // 3. 거래처
  const partnersToInsert: InsertPartner[] = [
    {
      name: '기본 고객', businessNumber: '123-45-67890', type: PartnerTypeEnum.CUSTOMER,
      contactName: '홍길동', phone: '010-1234-5678', email: 'customer@example.com',
      address: '서울시 강남구', isActive: true, creditLimit: 1000000, notes: '기본 고객 거래처', createdBy: adminId
    },
    {
      name: '기본 공급사', businessNumber: '234-56-78901', type: PartnerTypeEnum.SUPPLIER,
      contactName: '김철수', phone: '010-2345-6789', email: 'supplier@example.com',
      address: '서울시 서초구', isActive: true, creditLimit: 2000000, notes: '기본 공급사 거래처', createdBy: adminId
    }
  ];
  for (const partner of partnersToInsert) {
    const exists = await db.select().from(partners).where(eq(partners.name, partner.name));
    if (exists.length === 0) {
      await db.insert(partners).values(partner);
      console.log(`거래처 ${partner.name} 생성 완료`);
    } else {
      console.log(`거래처 ${partner.name} 이미 존재`);
    }
  }

  // 4. 품목 분류
  const categoryName = '전자제품';
  let categoryId: number;
  const catExists = await db.select().from(categories).where(eq(categories.name, categoryName));
  if (catExists.length === 0) {
    const inserted = await db.insert(categories).values({ name: categoryName, parentId: null, level: 1 }).returning({ id: categories.id });
    categoryId = inserted[0].id;
    console.log('카테고리 생성 완료');
  } else {
    categoryId = catExists[0].id;
    console.log('카테고리 이미 존재');
  }

  // 5. 품목
  const itemCode = 'I-001';
  let itemId: number;
  const itemExists = await db.select().from(items).where(eq(items.code, itemCode));
  if (itemExists.length === 0) {
    const inserted = await db.insert(items).values({
      code: itemCode,
      name: '스마트폰',
      description: '최신형 스마트폰',
      categoryId,
      unitPrice: 500000,
      costPrice: 400000,
      unit: '대',
      isActive: true,
      minStockLevel: 5,
      image: null,
      notes: '인기 상품',
      createdBy: adminId
    } as InsertItem).returning({ id: items.id });
    itemId = inserted[0].id;
    console.log('품목 생성 완료');
  } else {
    itemId = itemExists[0].id;
    console.log('품목 이미 존재');
  }

  // 6. 바코드
  const barcodeValue = '8801234567890';
  const barcodeExists = await db.select().from(barcodes).where(eq(barcodes.barcode, barcodeValue));
  if (barcodeExists.length === 0) {
    await db.insert(barcodes).values({ itemId, barcode: barcodeValue, isActive: true });
    console.log('바코드 생성 완료');
  } else {
    console.log('바코드 이미 존재');
  }

  // 7. 재고
  const invExists = await db.select().from(inventory).where(eq(inventory.itemId, itemId));
  if (invExists.length === 0) {
    await db.insert(inventory).values({ itemId, quantity: 10 });
    console.log('재고 생성 완료');
  } else {
    console.log('재고 이미 존재');
  }

  sqlite.close();
}


insertSampleData().then(() => {
console.log('샘플 데이터 삽입 완료');
}).catch(e => {
console.error(e);
});
