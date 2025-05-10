import { Router } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { hashPassword } from "../auth"; // auth.ts 파일에서 함수 export 필요

export const usersRouter = Router();

// 사용자 목록 조회 (관리자만)
usersRouter.get("/", async (req, res, next) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    const users = await storage.getUsers();
    
    // 비밀번호 제외하고 반환
    const safeUsers = users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
    
    res.json(safeUsers);
  } catch (error) {
    next(error);
  }
});

// 사용자 상세 조회 (관리자 또는 본인만)
usersRouter.get("/:id", async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const userId = parseInt(req.params.id);
    
    // 관리자가 아니고 본인 정보가 아니면 접근 거부
    if (req.user.role !== "admin" && req.user.id !== userId) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 비밀번호 제외하고 반환
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    next(error);
  }
});

// 사용자 정보 수정 (관리자 또는 본인만)
usersRouter.put("/:id", async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const userId = parseInt(req.params.id);
    
    // 관리자가 아니고 본인 정보가 아니면 접근 거부
    if (req.user.role !== "admin" && req.user.id !== userId) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    const updateData: any = { ...req.body };
    
    // 비밀번호 변경이 있으면 해시 처리
    if (updateData.password) {
      updateData.password = await hashPassword(updateData.password);
    }
    
    // 일반 사용자는 자신의 role을 변경할 수 없음
    if (req.user.role !== "admin") {
      delete updateData.role;
      delete updateData.isActive;
    }

    const updatedUser = await storage.updateUser(userId, updateData);
    if (!updatedUser) {
      return res.status(500).json({ message: "사용자 정보 업데이트에 실패했습니다." });
    }

    // 비밀번호 제외하고 반환
    const { password, ...safeUser } = updatedUser;
    res.json(safeUser);
  } catch (error) {
    next(error);
  }
});

// 사용자 권한 목록 조회
usersRouter.get("/:id/permissions", async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const userId = parseInt(req.params.id);
    
    // 관리자가 아니고 본인 정보가 아니면 접근 거부
    if (req.user.role !== "admin" && req.user.id !== userId) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    const permissions = await storage.getUserPermissions(userId);
    res.json(permissions);
  } catch (error) {
    next(error);
  }
});

// 사용자 권한 설정 (관리자만)
usersRouter.post("/:id/permissions", async (req, res, next) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    const permission = await storage.setUserPermission({
      userId,
      ...req.body
    });

    res.status(201).json(permission);
  } catch (error) {
    next(error);
  }
});
