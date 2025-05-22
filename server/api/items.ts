import { Router } from "express";
import { storage } from "../storage";
import { insertItemSchema, insertCategorySchema, insertBarcodeSchema } from "@shared/schema";
import { z } from "zod";
import listEndpoints from 'express-list-endpoints';

export const itemsRouter = Router();

// 권한 확인 미들웨어
const checkPermission = (action: 'read' | 'write' | 'delete' | 'export') => async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  // 관리자는 모든 권한 보유
  if (req.user.role === "admin") {
    return next();
  }

  const permissions = await storage.getUserPermissions(req.user.id);
  const itemPermission = permissions.find(p => p.resource === "items");

  if (!itemPermission) {
    return res.status(403).json({ message: "품목 관리 권한이 없습니다." });
  }

  const hasPermission = 
    (action === 'read' && itemPermission.canRead) ||
    (action === 'write' && itemPermission.canWrite) ||
    (action === 'delete' && itemPermission.canDelete) ||
    (action === 'export' && itemPermission.canExport);

  if (!hasPermission) {
    return res.status(403).json({ message: `품목 ${action} 권한이 없습니다.` });
  }

  next();
};

// 품목 분류 API

// 분류 목록 조회
itemsRouter.get("/categories", checkPermission('read'), async (req, res, next) => {
  try {
    const categories = await storage.getCategories();
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// 분류 등록
itemsRouter.post("/categories", checkPermission('write'), async (req, res, next) => {
  try {
    const categoryData = req.body;
    
    // Zod로 검증
    const validationResult = insertCategorySchema.safeParse(categoryData);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "입력 데이터가 유효하지 않습니다.", 
        errors: validationResult.error.errors 
      });
    }
    
    // 상위 카테고리 존재 확인 (있는 경우)
    if (categoryData.parentId) {
      const parentCategory = await storage.getCategories().then(
        cats => cats.find(c => c.id === categoryData.parentId)
      );
      
      if (!parentCategory) {
        return res.status(400).json({ message: "상위 분류가 존재하지 않습니다." });
      }
      
      // 부모 카테고리 레벨 확인
      if (parentCategory.level >= 3) {
        return res.status(400).json({ message: "최대 3단계까지만 분류를 생성할 수 있습니다." });
      }
      
      // 자동으로 레벨 설정 (부모 + 1)
      categoryData.level = parentCategory.level + 1;
    }
    
    const category = await storage.createCategory(validationResult.data);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

// 품목 API

// 품목 목록 조회
itemsRouter.get("/", checkPermission('read'), async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    const items = await storage.getItems(categoryId ? parseInt(categoryId as string) : undefined);
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// 품목 상세 조회
itemsRouter.get("/:id", checkPermission('read'), async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id);
    const item = await storage.getItem(itemId);
    
    if (!item) {
      return res.status(404).json({ message: "품목을 찾을 수 없습니다." });
    }
    
    // 바코드 정보 조회
    const barcodes = await storage.getBarcodesByItem(itemId);
    
    // 재고 정보 조회
    const inventory = await storage.getInventory(itemId);
    
    res.json({
      ...item,
      barcodes,
      stock: inventory?.quantity || 0
    });
  } catch (error) {
    next(error);
  }
});

// 품목 등록
itemsRouter.post("/", checkPermission('write'), async (req, res, next) => {
  try {
    const item = await storage.createItem(req.body);
    await storage.addUserActivity({
      userId: req.user.id,
      action: "create",
      target: `품목 ${item.name}`,
      description: JSON.stringify(req.body)
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

// 품목 수정
itemsRouter.put("/:id", checkPermission('write'), async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id);
    const updated = await storage.updateItem(itemId, req.body);
    if (!updated) return res.status(404).json({ message: "품목을 찾을 수 없습니다." });
    await storage.addUserActivity({
      userId: req.user.id,
      action: "update",
      target: `품목 ${updated.name}`,
      description: JSON.stringify(req.body)
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// 품목 삭제
itemsRouter.delete("/:id", checkPermission('delete'), async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id);
    const item = await storage.getItem(itemId);
    const deleted = await storage.deleteItem(itemId);
    if (!deleted) return res.status(404).json({ message: "품목을 찾을 수 없습니다." });
    await storage.addUserActivity({
      userId: req.user.id,
      action: "delete",
      target: `품목 ${item?.name || itemId}`,
      description: JSON.stringify({ itemId })
    });
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

// 바코드 API

// 품목별 바코드 목록 조회 (숫자 id만 허용)
itemsRouter.get("/:id(\\d+)/barcodes", checkPermission('read'), async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id);
    const barcodes = await storage.getBarcodesByItem(itemId);
    
    res.json(barcodes);
  } catch (error) {
    next(error);
  }
});

// 바코드 등록
itemsRouter.post("/:id/barcodes", checkPermission('write'), async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id);
    const { barcode } = req.body;
    
    // 품목 존재 확인
    const item = await storage.getItem(itemId);
    if (!item) {
      return res.status(404).json({ message: "품목을 찾을 수 없습니다." });
    }
    
    // 바코드 중복 확인
    const existingBarcode = await storage.getBarcodeByValue(barcode);
    if (existingBarcode) {
      return res.status(400).json({ message: "이미 등록된 바코드입니다." });
    }
    
    // Zod로 검증
    const validationResult = insertBarcodeSchema.safeParse({
      itemId,
      barcode,
      isActive: true
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "입력 데이터가 유효하지 않습니다.", 
        errors: validationResult.error.errors 
      });
    }
    
    const newBarcode = await storage.createBarcode(validationResult.data);
    res.status(201).json(newBarcode);
  } catch (error) {
    next(error);
  }
});

// 바코드 조회 API (스캐너 연동용)
itemsRouter.get("/barcode/:barcode", checkPermission('read'), async (req, res, next) => {
  try {
    const barcode = req.params.barcode;
    const barcodeInfo = await storage.getBarcodeByValue(barcode);
    
    if (!barcodeInfo) {
      return res.status(404).json({ message: "바코드 정보를 찾을 수 없습니다." });
    }
    
    // 재고 정보 추가
    const inventory = await storage.getInventory(barcodeInfo.item.id);
    
    res.json({
      ...barcodeInfo,
      stock: inventory?.quantity || 0
    });
  } catch (error) {
    next(error);
  }
});
