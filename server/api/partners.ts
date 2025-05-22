import { Router } from "express";
import { storage } from "../storage";
import { insertPartnerSchema } from "@shared/schema";
import { z } from "zod";

export const partnersRouter = Router();

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
  const partnerPermission = permissions.find(p => p.resource === "partners");

  if (!partnerPermission) {
    return res.status(403).json({ message: "거래처 관리 권한이 없습니다." });
  }

  const hasPermission = 
    (action === 'read' && partnerPermission.canRead) ||
    (action === 'write' && partnerPermission.canWrite) ||
    (action === 'delete' && partnerPermission.canDelete) ||
    (action === 'export' && partnerPermission.canExport);

  if (!hasPermission) {
    return res.status(403).json({ message: `거래처 ${action} 권한이 없습니다.` });
  }

  next();
};

// 거래처 목록 조회
partnersRouter.get("/", checkPermission('read'), async (req, res, next) => {
  try {
    const { type } = req.query;
    const partners = await storage.getPartners(type as string | undefined);
    res.json(partners);
  } catch (error) {
    next(error);
  }
});

// 거래처 상세 조회
partnersRouter.get("/:id", checkPermission('read'), async (req, res, next) => {
  try {
    const partnerId = parseInt(req.params.id);
    const partner = await storage.getPartner(partnerId);
    
    if (!partner) {
      return res.status(404).json({ message: "거래처를 찾을 수 없습니다." });
    }
    
    res.json(partner);
  } catch (error) {
    next(error);
  }
});

// 거래처 등록
partnersRouter.post("/", checkPermission('write'), async (req, res, next) => {
  try {
    const partner = await storage.createPartner(req.body);
    await storage.addUserActivity({
      userId: req.user.id,
      action: "create",
      target: `거래처 ${partner.name}`,
      description: JSON.stringify(req.body)
    });
    res.status(201).json(partner);
  } catch (error) {
    next(error);
  }
});

// 거래처 수정
partnersRouter.put("/:id", checkPermission('write'), async (req, res, next) => {
  try {
    const partnerId = parseInt(req.params.id);
    const updated = await storage.updatePartner(partnerId, req.body);
    if (!updated) return res.status(404).json({ message: "거래처를 찾을 수 없습니다." });
    await storage.addUserActivity({
      userId: req.user.id,
      action: "update",
      target: `거래처 ${updated.name}`,
      description: JSON.stringify(req.body)
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// 거래처 삭제
partnersRouter.delete("/:id", checkPermission('delete'), async (req, res, next) => {
  try {
    const partnerId = parseInt(req.params.id);
    const partner = await storage.getPartner(partnerId);
    const deleted = await storage.deletePartner(partnerId);
    if (!deleted) return res.status(404).json({ message: "거래처를 찾을 수 없습니다." });
    await storage.addUserActivity({
      userId: req.user.id,
      action: "delete",
      target: `거래처 ${partner?.name || partnerId}`,
      description: JSON.stringify({ partnerId })
    });
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});
