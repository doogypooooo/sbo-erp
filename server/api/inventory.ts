import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";

export const inventoryRouter = Router();

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
  const inventoryPermission = permissions.find(p => p.resource === "inventory");

  if (!inventoryPermission) {
    return res.status(403).json({ message: "재고 관리 권한이 없습니다." });
  }

  const hasPermission = 
    (action === 'read' && inventoryPermission.canRead) ||
    (action === 'write' && inventoryPermission.canWrite) ||
    (action === 'delete' && inventoryPermission.canDelete) ||
    (action === 'export' && inventoryPermission.canExport);

  if (!hasPermission) {
    return res.status(403).json({ message: `재고 ${action} 권한이 없습니다.` });
  }

  next();
};

// 모든 품목의 재고 조회
inventoryRouter.get("/", checkPermission('read'), async (req, res, next) => {
  try {
    // 모든 품목 가져오기
    const items = await storage.getItems();
    
    // 각 품목의 재고 정보 조회
    const inventoryData = await Promise.all(
      items.map(async (item) => {
        const inventory = await storage.getInventory(item.id);
        return {
          itemId: item.id,
          itemCode: item.code,
          itemName: item.name,
          quantity: inventory?.quantity || 0,
          unit: item.unit,
          minStockLevel: item.minStockLevel,
          isLow: (inventory?.quantity || 0) < (item.minStockLevel || 0)
        };
      })
    );
    
    res.json(inventoryData);
  } catch (error) {
    next(error);
  }
});

// 특정 품목의 재고 조회
inventoryRouter.get("/:itemId", checkPermission('read'), async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.itemId);
    
    // 품목 정보 조회
    const item = await storage.getItem(itemId);
    if (!item) {
      return res.status(404).json({ message: "품목을 찾을 수 없습니다." });
    }
    
    // 재고 정보 조회
    const inventory = await storage.getInventory(itemId);
    
    // 재고 이력 조회
    const history = await storage.getInventoryHistory(itemId);
    
    res.json({
      item,
      stock: inventory?.quantity || 0,
      isLow: (inventory?.quantity || 0) < (item.minStockLevel || 0),
      lastUpdated: inventory?.updatedAt,
      history: history.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });
  } catch (error) {
    next(error);
  }
});

// 재고 수정 (수동 조정)
inventoryRouter.post("/:itemId/adjust", checkPermission('write'), async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { quantity, notes } = req.body;
    
    // 품목 존재 확인
    const item = await storage.getItem(itemId);
    if (!item) {
      return res.status(404).json({ message: "품목을 찾을 수 없습니다." });
    }
    
    // 수량 유효성 검사
    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ message: "유효하지 않은 수량입니다." });
    }
    
    // 재고 업데이트
    const updatedInventory = await storage.updateInventory(itemId, quantity);
    
    // 재고 이력 확인
    const history = await storage.getInventoryHistory(itemId);
    const latestHistory = history.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    res.json({
      item,
      stock: updatedInventory.quantity,
      history: latestHistory
    });
  } catch (error) {
    next(error);
  }
});

// 재고 이력 조회
inventoryRouter.get("/:itemId/history", checkPermission('read'), async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.itemId);
    
    // 품목 존재 확인
    const item = await storage.getItem(itemId);
    if (!item) {
      return res.status(404).json({ message: "품목을 찾을 수 없습니다." });
    }
    
    // 재고 이력 조회
    const history = await storage.getInventoryHistory(itemId);
    
    // 정렬: 최신순
    const sortedHistory = history.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    res.json(sortedHistory);
  } catch (error) {
    next(error);
  }
});

// 부족 재고 알림 조회
inventoryRouter.get("/alerts/low", checkPermission('read'), async (req, res, next) => {
  try {
    // 모든 품목 가져오기
    const items = await storage.getItems();
    
    // 각 품목의 재고 정보 조회하여 부족 재고 필터링
    const lowStockItems = await Promise.all(
      items.map(async (item) => {
        const inventory = await storage.getInventory(item.id);
        const quantity = inventory?.quantity || 0;
        
        // 최소 재고 수준보다 적은 경우
        if (item.minStockLevel && quantity < item.minStockLevel) {
          return {
            itemId: item.id,
            itemCode: item.code,
            itemName: item.name,
            quantity,
            minStockLevel: item.minStockLevel,
            unit: item.unit,
            shortage: item.minStockLevel - quantity
          };
        }
        return null;
      })
    );
    
    // null 제거 후 반환
    const filteredItems = lowStockItems.filter(item => item !== null);
    
    res.json(filteredItems);
  } catch (error) {
    next(error);
  }
});
