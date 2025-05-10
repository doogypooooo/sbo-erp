import { Router } from "express";
import { storage } from "../storage";

export const barcodesRouter = Router();

// 권한 확인 미들웨어 (items와 동일)
const checkPermission = (action: 'read' | 'write' | 'delete' | 'export') => async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
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

// 모든 바코드 목록 조회 (품목 정보 포함)
barcodesRouter.get("/", checkPermission('read'), async (req, res, next) => {
  try {
    const allItems = await storage.getItems();
    const allBarcodes = [];
    for (const item of allItems) {
      const barcodes = await storage.getBarcodesByItem(item.id);
      for (const barcode of barcodes) {
        allBarcodes.push({
          ...barcode,
          item: {
            id: item.id,
            code: item.code,
            name: item.name
          }
        });
      }
    }
    res.json(allBarcodes);
  } catch (error) {
    next(error);
  }
});

// 바코드 삭제
barcodesRouter.delete("/:id", checkPermission('delete'), async (req, res, next) => {
  try {
    const barcodeId = parseInt(req.params.id);
    // 바코드 존재 확인
    let found = false;
    const allItems = await storage.getItems();
    for (const item of allItems) {
      const barcodes = await storage.getBarcodesByItem(item.id);
      if (barcodes.some(b => b.id === barcodeId)) {
        found = true;
        break;
      }
    }
    if (!found) {
      return res.status(404).json({ message: "바코드를 찾을 수 없습니다." });
    }
    await storage.deleteBarcode(barcodeId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}); 