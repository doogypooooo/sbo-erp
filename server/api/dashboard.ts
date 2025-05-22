import { Router } from "express";
import { db } from "../db";
import { transactions, transactionItems, items } from "@shared/schema";
import { sql, eq, sum, desc, and } from "drizzle-orm";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (req, res, next) => {
  try {
    const { from, to } = req.query as { from?: string, to?: string };

    let tempDate = new Date(Date.parse(from));
    const fromDateTime = new Date(tempDate.getFullYear(), tempDate.getMonth()-1, 1).toISOString();
    tempDate = new Date(Date.parse(to));
    const toDateTime = new Date(tempDate.getFullYear(), tempDate.getMonth()-1, 1).toISOString();
    


    // 매출 이전달
    const salesPrevious = await db.select({ total: sql<number>`IFNULL(SUM(total_amount),0)` })
      .from(transactions)
      .where(sql`type = 'sale' AND date >= ${fromDateTime} AND date <= ${toDateTime}`)
      .then(rows => rows[0]?.total ?? 0);

    // 메츨 이번달
    const salesCurrent = await db.select({ total: sql<number>`IFNULL(SUM(total_amount),0)` })
      .from(transactions)
      .where(sql`type = 'sale' AND date >= ${from} AND date <= ${to}`)
      .then(rows => rows[0]?.total ?? 0);    

    // 매입 이전달
    const purchasesPrevious = await db.select({ total: sql<number>`IFNULL(SUM(total_amount),0)` })
      .from(transactions)
      .where(sql`type = 'purchase' AND date >= ${fromDateTime} AND date <= ${toDateTime}`)
      .then(rows => rows[0]?.total ?? 0);

    // 매입 이번달
    const purchasesCurrent = await db.select({ total: sql<number>`IFNULL(SUM(total_amount),0)` })
      .from(transactions)
      .where(sql`type = 'purchase' AND date >= ${from} AND date <= ${to}`)
      .then(rows => rows[0]?.total ?? 0);      


    // 미수금 이전달 (예시: sale + status unpaid/partial)
    const unpaidPrevious = await db.select({ total: sql<number>`IFNULL(SUM(total_amount),0)` })
      .from(transactions)
      .where(sql`type = 'sale' AND status IN ('unpaid', 'partial') AND created_at >= ${fromDateTime} AND created_at <= ${toDateTime} `)
      .then(rows => rows[0]?.total ?? 0);

    // 미수금 이번달
    const unpaidCurrent = await db.select({ total: sql<number>`IFNULL(SUM(total_amount),0)`  })
      .from(transactions)
      .where(sql`type = 'sale' AND status IN ('unpaid', 'partial') AND created_at >= ${from} AND created_at <= ${to} `)
      .then(rows => rows[0]?.total ?? 0);    

    // 미지급금 이전달(예시: purchase + status unpaid/partial)
    const liabilityPrevious = await db.select({ total: sql<number>`IFNULL(SUM(total_amount),0)`})
      .from(transactions)
      .where(sql`type = 'purchase' AND status IN ('unpaid', 'partial')  AND created_at >= ${fromDateTime} AND created_at <= ${toDateTime} `)
      .then(rows => rows[0]?.total ?? 0);

      // 미지급금 이번달
      const liabilityCurrent = await db.select({ total: sql<number>`IFNULL(SUM(total_amount),0)`})
      .from(transactions)
      .where(sql`type = 'purchase' AND status IN ('unpaid', 'partial')  AND created_at >= ${from} AND created_at <= ${to} `)
      .then(rows => rows[0]?.total ?? 0);    

    let scale_change = 100;
    if(salesPrevious != 0)
      scale_change = (Math.min(salesPrevious, salesCurrent) / Math.max(salesPrevious, salesCurrent))  * 100;

    let purchases_change = 100;
    if(purchasesPrevious != 0)
      purchases_change = (Math.min(purchasesPrevious, purchasesCurrent) / Math.max(purchasesPrevious, purchasesCurrent))  * 100;

    let unpaid_change = 100;
    if(unpaidPrevious != 0)
      unpaid_change = (Math.min(unpaidPrevious, unpaidCurrent) / Math.max(unpaidPrevious, unpaidCurrent))  * 100;

    let liability_change = 100;
    if(liabilityPrevious != 0)
      liability_change = (Math.min(liabilityPrevious, liabilityCurrent) / Math.max(liabilityPrevious, liabilityCurrent))  * 100;



          
    res.json({
      sales: { current: salesCurrent.toLocaleString("ko-KR") + " 원", previous : salesPrevious.toLocaleString("ko-KR") +" 원", change: scale_change + "%" , isPositive: salesCurrent > salesPrevious ? true : false },
      purchases: { current: purchasesCurrent.toLocaleString("ko-KR") +" 원", previous : purchasesPrevious.toLocaleString("ko-KR") +" 원", change: purchases_change + "%" , isPositive:  purchasesCurrent > purchasesPrevious ? true : false },
      unpaid: { current: unpaidCurrent.toLocaleString("ko-KR") + " 원", previous : unpaidPrevious.toLocaleString("ko-KR") +" 원", change: unpaid_change + "%" , isPositive: unpaidCurrent > unpaidPrevious ? true : false },
      liability: { current: liabilityCurrent.toLocaleString("ko-KR") + " 원", previous : liabilityPrevious.toLocaleString("ko-KR") +" 원", change: liability_change + "%" , isPositive: liabilityCurrent > liabilityPrevious ? true : false }
    });
  } catch (error) {
    next(error);
  }
});

// 판매 상위 품목 조회 API
dashboardRouter.get("/top-selling-items", async (req, res, next) => {
  try {
    const { from, to } = req.query as { from?: string, to?: string };

    let query = db
      .select({
        itemId: items.id,
        name: items.name,
        quantity: sql<number>`CAST(SUM(${transactionItems.quantity}) AS INTEGER)`.as('quantity'),
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .innerJoin(items, eq(transactionItems.itemId, items.id))
      .where(eq(transactions.type, 'sale'));

    if (from && to) {
      query = query.where(and(sql`${transactions.date} >= ${from}`, sql`${transactions.date} <= ${to}`));
    }

    const topItems = await query
      .groupBy(items.id, items.name)
      .orderBy(desc(sql`quantity`))
      .limit(5);

    // 순위 추가
    const topItemsWithRank = topItems.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    res.json(topItemsWithRank);
  } catch (error) {
    next(error);
  }
});
