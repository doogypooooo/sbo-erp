import { Router } from "express";
import { storage } from "../storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { transactions, transactionItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import xlsx from 'xlsx';
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function logErrorToFile(message: string, err: any) {
  const logDir = path.join(__dirname, "../logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
  const logPath = path.join(logDir, "db-error.log");
  const logMsg = `[${new Date().toISOString()}] ${message} ${err?.stack || err}\n`;
  fs.appendFileSync(logPath, logMsg, "utf8");
  console.error(logMsg);
}

export const transactionsRouter = Router();

// 거래 등록
transactionsRouter.post("/", async (req, res, next) => {
  try {
    const { transaction, items } = req.body;
    const created = await storage.createTransaction(transaction, items);
    await storage.addUserActivity({
      userId: req.user.id,
      action: "create",
      target: `거래 ${created.code}`,
      description: "거래 등록"
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

// 거래 목록 조회
transactionsRouter.get("/", async (req, res) => {
  try {
    const { type, status } = req.query;
    const txs = await storage.getTransactions(type as string | undefined, status as string | undefined);
    const partners = await storage.getPartners();
    const txsWithPartnerName = txs.map(tx => {
      const partner = partners.find(p => p.id === tx.partnerId);
      return { ...tx, partnerName: partner ? partner.name : "" };
    });
    res.json(txsWithPartnerName);
  } catch (err) {
    logErrorToFile("[GET /api/transactions] DB ERROR:", err);
    res.status(500).json({ message: "거래 목록 조회 중 오류가 발생했습니다." });
  }
});

// 거래 삭제
transactionsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const transaction = await storage.getTransaction(id);
    const deleted = await storage.deleteTransaction(id);
    if (!deleted) return res.status(404).json({ message: "거래를 찾을 수 없습니다." });
    await storage.addUserActivity({
      userId: req.user.id,
      action: "delete",
      target: `거래 ${transaction?.code || id}`,
      description: "거래 삭제"
    });
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

// 거래 상세(품목) 목록 조회
transactionsRouter.get("/:id/items", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const items = await storage.getTransactionItems(id);
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "품목 목록 조회 중 오류가 발생했습니다." });
  }
});

// 거래 수정
transactionsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await storage.updateTransaction(id, req.body);
    if (!updated) return res.status(404).json({ message: "거래를 찾을 수 없습니다." });
    await storage.addUserActivity({
      userId: req.user.id,
      action: "update",
      target: `거래 ${updated.code}`,
      description: "거래 수정"
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// 엑셀 다운로드 (거래+품목 펼침)
transactionsRouter.get('/export', async (req, res) => {
  try {
    const type = req.query.type === 'sale' ? 'sale' : 'purchase';
    const txs = await storage.getTransactions(type);
    let rows: any[] = [];
    const partners = await storage.getPartners();
    for (const tx of txs) {
      const items = await storage.getTransactionItems(tx.id);
      // partnerName 항상 partnerId로 조회
      const partner = partners.find((p: any) => p.id === tx.partnerId);
      const partnerName = partner?.name || '';
      for (const item of items) {
        // 품목명 조회 (itemId → name)
        let itemName = '';
        if (item.itemId) {
          const itemObj = await storage.getItem(item.itemId);
          itemName = itemObj?.name || '';
        }
        rows.push({
          거래ID: tx.id,
          번호: tx.code,
          거래처: partnerName,
          일자: tx.date,
          상태: tx.status,
          품목명: itemName,
          수량: item.quantity,
          단가: item.unitPrice,
          공급가액: item.amount,
          세액: item.taxAmount,
          메모: tx.notes,
        });
      }
    }
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, type === 'sale' ? '판매출고' : '구매입고');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${type === 'sale' ? 'sales' : 'purchases'}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: '엑셀 다운로드 실패' });
  }
});

// 엑셀 업로드 (거래+품목 펼침)
transactionsRouter.post('/import', upload.single('file'), async (req, res) => {
  try {
    const type = req.query.type === 'sale' ? 'sale' : 'purchase';
    const filePath = (req.file as any).path;
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws);
    // 거래ID/번호로 그룹핑
    const txMap = new Map();
    for (const rowAny of data as any[]) {
      const row = rowAny as any;
      const txKey = row['번호'] || row['구매번호'] || row['거래ID'] || row['코드'];
      if (!txMap.has(txKey)) {
        txMap.set(txKey, {
          code: row['번호'] || row['구매번호'] || row['코드'],
          partnerName: row['거래처'],
          date: row['일자'] || row['입고일자'],
          status: row['상태'],
          notes: row['메모'] ?? '',
          items: [],
        });
      }
      txMap.get(txKey).items.push({
        name: row['품목명'],
        quantity: row['수량'],
        unitPrice: row['단가'],
        amount: row['공급가액'],
        taxAmount: row['세액'],
      });
    }
    // 파트너/품목 이름 → ID 변환 및 저장
    const partners = await storage.getPartners();
    const itemsAll = await storage.getItems();
    for (const tx of Array.from(txMap.values())) {
      const partner = partners.find((p: any) => p.name === tx.partnerName);
      const partnerId = partner ? partner.id : null;
      if (!partnerId) continue; // 거래처 없으면 skip
      const items = tx.items.map((it: any) => {
        const itemObj = itemsAll.find((i: any) => i.name === it.name);
        return {
          itemId: itemObj?.id,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: it.amount,
          taxAmount: it.taxAmount,
        };
      }).filter((it: any) => it.itemId);
      if (items.length === 0) continue;

      // 중복 코드 처리: 있으면 update, 없으면 insert
      const existing = await storage.getTransactions(type);
      const found = existing.find((t: any) => t.code === tx.code);
      if (found) {
        // update 거래
        await storage.updateTransaction(found.id, {
          partnerId,
          date: tx.date,
          status: tx.status,
          notes: tx.notes,
          type,
        });
        // 기존 품목 삭제 후 재등록
        await storage["db"].delete(transactionItems).where(eq(transactionItems.transactionId, found.id)).run();
        for (const item of items) {
          await storage["db"].insert(transactionItems).values({
            transactionId: found.id,
            ...item,
          }).run();
        }
      } else {
        // 신규 등록
        await storage.createTransaction({
          code: tx.code,
          partnerId,
          date: tx.date,
          status: tx.status,
          notes: tx.notes,
          type,
        }, items);
      }
    }
    res.json({ message: '엑셀 업로드 완료' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: '엑셀 업로드 실패' });
  }
}); 