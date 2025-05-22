import { Router } from "express";
import { db } from "../db";
import { transactions } from "@shared/schema";
import { sql, eq, and } from "drizzle-orm";
import { startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths, format, addMonths } from 'date-fns';

export const salesRouter = Router();

salesRouter.get("/chart", async (req, res, next) => {
  try {
    const { period } = req.query as { period?: string };
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '3month':
        startDate = startOfMonth(subMonths(now, 2));
        break;
      case 'year':
        startDate = startOfYear(now);
        break;
      case '6month':
      default:
        startDate = startOfMonth(subMonths(now, 5));
        break;
    }

    const endDate = endOfMonth(now);

    // 월별 매출 및 매입 데이터 집계
    const monthlyData = await db
      .select({
        date: sql<string>`strftime('%Y-%m', date)`.as('date'),
        type: transactions.type,
        total: sql<number>`SUM(total_amount)`.as('total'),
      })
      .from(transactions)
      .where(and(
        sql`date >= ${format(startDate, 'yyyy-MM-dd')}`,
        sql`date <= ${format(endDate, 'yyyy-MM-dd')}`,
        eq(transactions.status, 'completed') // 완료된 거래만 포함
      ))
      .groupBy(sql`strftime('%Y-%m', date)`, transactions.type)
      .orderBy(sql`strftime('%Y-%m', date)`);

    // 차트 형식에 맞게 데이터 변환
    const chartDataMap = new Map<string, { name: string; 매출: number; 매입: number }>();

    let currentMonth = startOfMonth(startDate);
    while (currentMonth <= endDate) {
        const monthKey = format(currentMonth, 'yyyy-MM');
        chartDataMap.set(monthKey, { name: format(currentMonth, 'M월'), 매출: 0, 매입: 0 });
        currentMonth = addMonths(currentMonth, 1);
    }

    monthlyData.forEach(item => {
        const monthKey = item.date;
        if (chartDataMap.has(monthKey)) {
            const entry = chartDataMap.get(monthKey);
            if (entry) {
                if (item.type === 'sale') {
                    entry.매출 = item.total;
                } else if (item.type === 'purchase') {
                    entry.매입 = item.total;
                }
            }
        }
    });

    const chartData = Array.from(chartDataMap.values());

    res.json(chartData);
  } catch (error) {
    next(error);
  }
});
