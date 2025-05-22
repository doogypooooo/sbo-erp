import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { TransactionTypeEnum, PartnerTypeEnum, UserRoleEnum } from "@shared/schema";
import BetterSqliteStoreFactory from 'better-sqlite3-session-store';
import { sqlite } from './db';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const BetterSqliteStore = BetterSqliteStoreFactory(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "sbo-erp-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new BetterSqliteStore({ client: sqlite }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1일
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "아이디 또는 비밀번호가 일치하지 않습니다." });
        }
        if (!user.isActive) {
          return done(null, false, { message: "비활성화된 계정입니다. 관리자에게 문의하세요." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // 회원가입 라우트
  app.post("/api/register", async (req, res, next) => {
    try {
      // 첫 번째 사용자는 관리자로 설정
      const existingUsers = await storage.getUsers();
      const role = existingUsers.length === 0 ? UserRoleEnum.ADMIN : UserRoleEnum.STAFF;

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "이미 존재하는 사용자 이름입니다." });
      }

      const user = await storage.createUser({
        ...req.body,
        role,
        password: await hashPassword(req.body.password),
      });

      // 기본 권한 설정 (관리자는 모든 권한, 일반 사용자는 제한된 권한)
      if (role === UserRoleEnum.ADMIN) {
        // 관리자 권한 설정
        const resources = [
          "dashboard", "partners", "items", "barcodes", "purchases", 
          "sales", "inventory", "vouchers", "accounts", "payments", 
          "statements", "tax", "users", "settings"
        ];
        
        for (const resource of resources) {
          await storage.setUserPermission({
            userId: user.id,
            resource,
            canRead: true,
            canWrite: true,
            canDelete: true,
            canExport: true
          });
        }
      } else {
        // 일반 사용자 기본 권한 설정
        const resources = ["dashboard", "partners", "items", "purchases", "sales", "inventory"];
        
        for (const resource of resources) {
          await storage.setUserPermission({
            userId: user.id,
            resource,
            canRead: true,
            canWrite: true,
            canDelete: false,
            canExport: false
          });
        }
      }

      // 첫 사용자 등록 시 기본 데이터 생성
      if (existingUsers.length === 0) {
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
          createdBy: user.id
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
          createdBy: user.id
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
          createdBy: user.id
        });
        
        // 기본 바코드 생성
        await storage.createBarcode({
          itemId: item.id,
          barcode: "8801234567890",
          isActive: true
        });
        
        // 기본 재고 생성
        await storage.updateInventory(item.id, 10);
      }

      req.login(user, async (err) => {
        if (err) return next(err);
        // 활동 로그 기록
        await storage.addUserActivity({
          userId: user.id,
          action: "create",
          target: `사용자 ${user.name}`,
          description: "회원가입"
        });
        // 비밀번호 필드 제거 후 응답
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  // 로그인 라우트
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: Error, user: SelectUser, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "로그인 실패" });

      req.login(user, async (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // 마지막 로그인 시간 업데이트
        await storage.updateUser(user.id, { lastLogin: new Date().toISOString() });
        
        // 활동 로그 기록
        await storage.addUserActivity({
          userId: user.id,
          action: "login",
          target: `사용자 ${user.name}`,
          description: "로그인"
        });
        
        // 비밀번호 필드 제거 후 응답
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // 로그아웃 라우트
  app.post("/api/logout", (req, res, next) => {
    const user = req.user;
    req.logout(async (err) => {
      if (err) return next(err);
      // 활동 로그 기록
      if (user) {
        await storage.addUserActivity({
          userId: user.id,
          action: "logout",
          target: `사용자 ${user.name}`,
          description: "로그아웃"
        });
      }
      res.sendStatus(200);
    });
  });

  // 현재 사용자 정보 조회 라우트
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // 비밀번호 필드 제거 후 응답
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // 사용자 권한 조회 라우트
  app.get("/api/user/permissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const permissions = await storage.getUserPermissions(req.user.id);
    res.json(permissions);
  });
}
