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
        isActive: true
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

  // 거래(구매/입고) API
  apiRouter.use("/transactions", transactionsRouter);

  // 대시보드 API
  apiRouter.get("/dashboard", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "로그인이 필요합니다." });

    res.json({
      sales: {
        current: "32,450,000원",
        previous: "28,800,000원",
        change: "+12.5%",
        isPositive: true
      },
      purchases: {
        current: "18,720,000원",
        previous: "17,280,000원",
        change: "+8.3%",
        isPositive: false
      },
      unpaid: {
        current: "5,280,000원",
        change: "+1,200,000원",
        count: 4,
        isPositive: false
      },
      liability: {
        current: "3,450,000원",
        change: "-860,000원",
        count: 2,
        isPositive: true
      }
    });
  });

  // 알림
  apiRouter.get("/notifications", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "로그인이 필요합니다." });

    res.json([
      {
        id: 1,
        type: "invoice",
        title: "세금계산서 발행 필요",
        description: "미발행 세금계산서 3건이 있습니다.",
        date: "2023-12-05T10:30:00"
      },
      {
        id: 2,
        type: "inventory",
        title: "재고 부족 알림",
        description: "3개 품목의 재고가 최소 수량 이하로 떨어졌습니다.",
        date: "2023-12-05T09:15:00"
      },
      {
        id: 3,
        type: "payment",
        title: "미수금 알림",
        description: "(주)가나상사의 미수금 기한이 3일 남았습니다.",
        date: "2023-12-04T16:45:00"
      }
    ]);
  });

  // 예정 작업
  apiRouter.get("/tasks", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "로그인이 필요합니다." });

    res.json([
      {
        id: 1,
        title: "세금계산서 발행",
        description: "11월 판매건 세금계산서 발행",
        dueDate: "2023-12-10T00:00:00",
        status: "pending"
      },
      {
        id: 2,
        title: "공급업체 결제",
        description: "다라마 공업 12월 결제",
        dueDate: "2023-12-15T00:00:00",
        status: "pending"
      },
      {
        id: 3,
        title: "재고 실사",
        description: "월말 재고 실사 진행",
        dueDate: "2023-12-30T00:00:00",
        status: "pending"
      }
    ]);
  });

  // 모든 API 경로에 /api 프리픽스 추가
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  
  // 기본 관리자 계정 생성
  await createDefaultAdminIfNeeded();

  return httpServer;
}
