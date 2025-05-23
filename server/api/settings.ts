import { Router } from "express";
import { storage } from "../storage";
import { companyInfoSchema } from "@shared/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { db } from '../../server/db';
import { spawn } from 'cross-spawn';

export const settingsRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let DB_PATH = path.join(__dirname, "../database/erp.db");
let BACKUP_DIR = path.join(__dirname, "../database/backups");

if (process.env.NODE_ENV === "development") {
  DB_PATH = path.join(__dirname, "../../database/erp.db");
  BACKUP_DIR = path.join(__dirname, "../../database/backups");
}

const MAX_BACKUPS = 10;
let backupInterval = 10; // 기본 10
let backupUnit = 'minute'; // 기본 분
let backupTimer = null;

function getBackupFiles() {
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // 최신순
}

function backupDatabase() {
  if (!fs.existsSync(DB_PATH)) throw new Error("DB 파일이 존재하지 않습니다.");
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const now = new Date();
  const filename = `erp_${now.toISOString().replace(/[-:T]/g, '').slice(0, 15)}.db`;
  const dest = path.join(BACKUP_DIR, filename);
  fs.copyFileSync(DB_PATH, dest);
  // 개수 제한
  const backups = getBackupFiles();
  if (backups.length > MAX_BACKUPS) {
    const toDelete = backups.slice(MAX_BACKUPS);
    toDelete.forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f.name)));
  }
  return filename;
}

function getMsFromInterval(interval, unit) {
  switch(unit) {
    case 'minute': return interval * 60 * 1000;
    case 'hour': return interval * 60 * 60 * 1000;
    case 'day': return interval * 24 * 60 * 60 * 1000;
    case 'week': return interval * 7 * 24 * 60 * 60 * 1000;
    default: return 10 * 60 * 1000;
  }
}

function startBackupTimer() {
  if (backupTimer) clearInterval(backupTimer);
  backupTimer = setInterval(backupDatabase, getMsFromInterval(backupInterval, backupUnit));
}

// 서버 시작 시 타이머 시작
startBackupTimer();

// 즉시 백업
settingsRouter.post("/backup", (req, res, next) => {
  try {
    const filename = backupDatabase();
    res.json({ success: true, filename });
  } catch (error) {
    next(error);
  }
});

// 백업 목록 조회
settingsRouter.get("/backups", (req, res, next) => {
  try {
    const files = getBackupFiles().map(f => f.name);
    res.json(files);
  } catch (error) {
    next(error);
  }
});

// 백업 파일 다운로드
settingsRouter.get("/backup/:filename/download", (req, res, next) => {
  try {
    const file = path.join(BACKUP_DIR, req.params.filename);
    if (!fs.existsSync(file)) return res.status(404).json({ message: "파일이 존재하지 않습니다." });
    res.download(file);
  } catch (error) {
    next(error);
  }
});

// 백업 파일 삭제
settingsRouter.delete("/backup/:filename", (req, res, next) => {
  try {
    const file = path.join(BACKUP_DIR, req.params.filename);
    if (!fs.existsSync(file)) return res.status(404).json({ message: "파일이 존재하지 않습니다." });
    fs.unlinkSync(file);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});


const restartProcess = () => {

  const child = spawn("npm", ["run", "dev"], { stdio: "inherit" });
  child.unref(); 

  setTimeout(function () {
      process.exit();
  }, 1000);
}



// 복원
settingsRouter.post("/restore", (req, res, next) => {
  try {
    const { filename } = req.body;
    const backupFile = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(backupFile)) return res.status(404).json({ message: "백업 파일이 존재하지 않습니다." });

    db.$client.close();

    fs.copyFileSync(backupFile, DB_PATH);

    restartProcess()

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 백업 주기 설정 (분/시간/일/주)
settingsRouter.post("/backup-schedule", (req, res, next) => {
  try {
    const { interval, unit } = req.body;
    const validUnits = ['minute', 'hour', 'day', 'week'];
    backupInterval = Math.max(1, Number(interval));
    backupUnit = validUnits.includes(unit) ? unit : 'minute';
    startBackupTimer();
    res.json({ success: true, interval: backupInterval, unit: backupUnit });
  } catch (error) {
    next(error);
  }
});

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