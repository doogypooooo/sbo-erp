import { Router } from "express";
import { storage } from "../storage";
import { companyInfoSchema } from "@shared/schema";

export const settingsRouter = Router();

// GET: 회사(공급자) 정보 조회
settingsRouter.get("/company", async (req, res, next) => {
  try {
    const company = await storage.getSetting("company");
    res.json(company || {});
  } catch (error) {
    next(error);
  }
});

// PUT: 회사(공급자) 정보 저장
settingsRouter.put("/company", async (req, res, next) => {
  try {
    const parse = companyInfoSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: "입력값이 올바르지 않습니다.", errors: parse.error.errors });
    }
    await storage.setSetting("company", parse.data);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}); 