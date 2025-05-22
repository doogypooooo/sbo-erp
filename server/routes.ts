import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { Router } from "express";
import { usersRouter } from "./api/users";
import { partnersRouter } from "./api/partners";
import { itemsRouter } from "./api/items";
import { inventoryRouter } from "./api/inventory";
import { accountingRouter } from "./api/accounting";
import { barcodesRouter } from "./api/barcodes";
import { transactionsRouter } from "./api/transactions";
import { UserRoleEnum, PartnerTypeEnum } from "@shared/schema";
import { log } from "./vite";
import { settingsRouter } from "./api/settings";
import { dashboardRouter } from "./api/dashboard";
import { salesRouter } from "./api/sales";
import { notificationsRouter } from "./api/notifications";
import scheduledTasksRouter from "./api/scheduled-tasks";
import searchRouter from "./api/search";

// 개발용 기본 관리자 계정 생성
async function createDefaultAdminIfNeeded() {
  try {
    const users = await storage.getUsers();
    
    if (users.length === 0) {
      log("기본 관리자 계정을 생성합니다...");
      
      const adminUser = await storage.createUser({
        username: "admin",
        password: await hashPassword("admin123"),
        name: "관리자",
        email: "",
        role: UserRoleEnum.ADMIN,
      });
      
      // 관리자 권한 설정
      const resources = [
        "dashboard", "partners", "items", "barcodes", "purchases", 
        "sales", "inventory", "vouchers", "accounts", "payments", 
        "statements", "tax", "users", "settings"
      ];
      
      for (const resource of resources) {
        await storage.setUserPermission({
          userId: adminUser.id,
          resource,
          canRead: true,
          canWrite: true,
          canDelete: true,
          canExport: true
        });
      }
      
      log("기본 관리자 계정이 생성되었습니다. (아이디: admin, 비밀번호: admin123)");

      // 기본 데이터 생성
      await createInitialData(adminUser.id);
    }
  } catch (error) {
    log(`기본 관리자 계정 생성 오류: ${error}`);
  }
}

// 초기 데이터 생성
async function createInitialData(userId: number) {
  try {
    // 기본 계정과목 생성
    await storage.createAccount({
      code: "101",
      name: "현금",
      type: "asset",
      isActive: true
    });
    
    await storage.createAccount({
      code: "201",
      name: "매출",
      type: "revenue",
      isActive: true
    });
    
    await storage.createAccount({
      code: "301",
      name: "매입",
      type: "expense",
      isActive: true
    });
    
    // 기본 거래처 생성
    await storage.createPartner({
      name: "기본 고객",
      businessNumber: "123-45-67890",
      type: PartnerTypeEnum.CUSTOMER,
      contactName: "홍길동",
      phone: "010-1234-5678",
      email: "customer@example.com",
      address: "서울시 강남구",
      isActive: true,
      creditLimit: 1000000,
      notes: "기본 고객 거래처",
      createdBy: userId
    });
    
    await storage.createPartner({
      name: "기본 공급사",
      businessNumber: "234-56-78901",
      type: PartnerTypeEnum.SUPPLIER,
      contactName: "김철수",
      phone: "010-2345-6789",
      email: "supplier@example.com",
      address: "서울시 서초구",
      isActive: true,
      creditLimit: 2000000,
      notes: "기본 공급사 거래처",
      createdBy: userId
    });
    
    // 기본 품목 분류 생성
    const category = await storage.createCategory({
      name: "전자제품",
      parentId: null,
      level: 1
    });
    
    // 기본 품목 생성
    const item = await storage.createItem({
      code: "I-001",
      name: "스마트폰",
      description: "최신형 스마트폰",
      categoryId: category.id,
      unitPrice: 500000,
      costPrice: 400000,
      unit: "대",
      isActive: true,
      minStockLevel: 5,
      image: null,
      notes: "인기 상품",
      createdBy: userId
    });
    
    // 기본 바코드 생성
    await storage.createBarcode({
      itemId: item.id,
      barcode: "8801234567890",
      isActive: true
    });
    
    // 기본 재고 생성
    await storage.updateInventory(item.id, 10);
    
    log("기본 데이터가 생성되었습니다.");
  } catch (error) {
    log(`기본 데이터 생성 오류: ${error}`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // 인증 설정
  setupAuth(app);

  // API 라우트 설정
  const apiRouter = Router();
  
  // 사용자/권한 API
  apiRouter.use("/users", usersRouter);
  
  // 거래처 API
  apiRouter.use("/partners", partnersRouter);
  
  // 품목/바코드 API
  apiRouter.use("/items", itemsRouter);
  apiRouter.use("/barcodes", barcodesRouter);
  
  // 재고 API
  apiRouter.use("/inventory", inventoryRouter);
  
  // 회계/재무 API
  apiRouter.use("/accounting", accountingRouter);

  // 환경설정 API
  apiRouter.use("/settings", settingsRouter);

  // 거래(구매/입고) API
  apiRouter.use("/transactions", transactionsRouter);

  // 대시보드 API
  apiRouter.use("/dashboard", dashboardRouter);  

  //SalesChart
  apiRouter.use("/sales", salesRouter);

  // 알림 API
  apiRouter.use("/notifications", notificationsRouter);

  // 예정 작업
  apiRouter.use("/scheduled-tasks", scheduledTasksRouter);

  // 통합 검색 API
  apiRouter.use("/search", searchRouter);

  // 모든 API 경로에 /api 프리픽스 추가
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  
  // 기본 관리자 계정 생성
  await createDefaultAdminIfNeeded();

  return httpServer;
}
