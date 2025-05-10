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
    const partnerData = req.body;
    
    // Zod로 검증
    const validationResult = insertPartnerSchema.safeParse({
      ...partnerData,
      createdBy: req.user.id
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "입력 데이터가 유효하지 않습니다.",
        errors: validationResult.error.errors
      });
    }
    
    // 사업자번호 중복 확인
    if (partnerData.businessNumber) {
      const existingPartners = await storage.getPartners();
      const duplicate = existingPartners.find(p => 
        p.businessNumber === partnerData.businessNumber
      );
      
      if (duplicate) {
        return res.status(400).json({ 
          message: "이미 등록된 사업자번호입니다."
        });
      }
    }
    
    const partner = await storage.createPartner({
      ...validationResult.data,
      createdBy: req.user.id
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
    const partnerData = req.body;

    // isActive가 string이면 boolean으로 변환
    if (typeof partnerData.isActive === "string") {
      partnerData.isActive = partnerData.isActive === "active";
    }

    const partner = await storage.getPartner(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "거래처를 찾을 수 없습니다." });
    }
    
    // 사업자번호 중복 확인 (변경된 경우에만)
    if (partnerData.businessNumber && partnerData.businessNumber !== partner.businessNumber) {
      const existingPartners = await storage.getPartners();
      const duplicate = existingPartners.find(p => 
        p.businessNumber === partnerData.businessNumber && p.id !== partnerId
      );
      
      if (duplicate) {
        return res.status(400).json({ 
          message: "이미 등록된 사업자번호입니다."
        });
      }
    }
    
    const updatedPartner = await storage.updatePartner(partnerId, partnerData);
    if (!updatedPartner) {
      return res.status(500).json({ message: "거래처 정보 업데이트에 실패했습니다." });
    }
    
    res.json(updatedPartner);
  } catch (error) {
    next(error);
  }
});

// 거래처 삭제
partnersRouter.delete("/:id", checkPermission('delete'), async (req, res, next) => {
  try {
    const partnerId = parseInt(req.params.id);
    
    const partner = await storage.getPartner(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "거래처를 찾을 수 없습니다." });
    }
    
    // TODO: 해당 거래처와 연관된 거래가 있는지 확인 후 삭제 여부 결정
    
    const deleted = await storage.deletePartner(partnerId);
    if (!deleted) {
      return res.status(500).json({ message: "거래처 삭제에 실패했습니다." });
    }
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
