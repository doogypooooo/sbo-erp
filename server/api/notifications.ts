import { Router } from "express";
import { storage } from "../storage";

export const notificationsRouter = Router();

// 알림 목록 조회 (로그인 유저)
notificationsRouter.get("/", async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    const notifications = await storage.getNotifications(req.user.id);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

// 알림 읽음 처리
notificationsRouter.post("/:id/read", async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    const id = parseInt(req.params.id);
    await storage.markNotificationRead(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 알림 설정 조회
notificationsRouter.get("/settings", async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    const settings = await storage.getUserNotificationSettings(req.user.id);
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// 알림 설정 변경
notificationsRouter.post("/settings", async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    const { type, enabled } = req.body;
    await storage.setUserNotificationSetting(req.user.id, type, enabled);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}); 