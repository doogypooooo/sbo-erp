import { Router } from "express";
import { storage } from "../storage";
import { 
  insertAccountSchema, 
  insertVoucherSchema, 
  insertVoucherItemSchema,
  insertPaymentSchema,
  insertTaxInvoiceSchema
} from "@shared/schema";
import { z } from "zod";

export const accountingRouter = Router();

// 권한 확인 미들웨어 (리소스별)
const checkPermission = (resource: string, action: 'read' | 'write' | 'delete' | 'export') => async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  // 관리자는 모든 권한 보유
  if (req.user.role === "admin") {
    return next();
  }

  const permissions = await storage.getUserPermissions(req.user.id);
  const resourcePermission = permissions.find(p => p.resource === resource);

  if (!resourcePermission) {
    return res.status(403).json({ message: `${resource} 관리 권한이 없습니다.` });
  }

  const hasPermission = 
    (action === 'read' && resourcePermission.canRead) ||
    (action === 'write' && resourcePermission.canWrite) ||
    (action === 'delete' && resourcePermission.canDelete) ||
    (action === 'export' && resourcePermission.canExport);

  if (!hasPermission) {
    return res.status(403).json({ message: `${resource} ${action} 권한이 없습니다.` });
  }

  next();
};

// 계정과목 API

// 계정과목 목록 조회
accountingRouter.get("/accounts", checkPermission('accounts', 'read'), async (req, res, next) => {
  try {
    const accounts = await storage.getAccounts();
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

// 계정과목 상세 조회
accountingRouter.get("/accounts/:id", checkPermission('accounts', 'read'), async (req, res, next) => {
  try {
    const accountId = parseInt(req.params.id);
    const account = await storage.getAccount(accountId);
    
    if (!account) {
      return res.status(404).json({ message: "계정과목을 찾을 수 없습니다." });
    }
    
    res.json(account);
  } catch (error) {
    next(error);
  }
});

// 계정과목 등록
accountingRouter.post("/accounts", checkPermission('accounts', 'write'), async (req, res, next) => {
  try {
    const accountData = req.body;
    
    // Zod로 검증
    const validationResult = insertAccountSchema.safeParse(accountData);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "입력 데이터가 유효하지 않습니다.", 
        errors: validationResult.error.errors 
      });
    }
    
    // 계정과목 코드 중복 확인
    const accounts = await storage.getAccounts();
    const duplicate = accounts.find(a => a.code === accountData.code);
    
    if (duplicate) {
      return res.status(400).json({ message: "이미 등록된 계정과목 코드입니다." });
    }
    
    const account = await storage.createAccount(validationResult.data);
    await storage.addUserActivity({
      userId: req.user.id,
      action: "create",
      target: `계정과목 ${account.name}`,
      description: JSON.stringify(req.body)
    });
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

// 계정과목 수정
accountingRouter.put("/accounts/:id", checkPermission('accounts', 'write'), async (req, res, next) => {
  try {
    const accountId = parseInt(req.params.id);
    const accountData = req.body;
    
    const account = await storage.getAccount(accountId);
    if (!account) {
      return res.status(404).json({ message: "계정과목을 찾을 수 없습니다." });
    }
    
    // 계정과목 코드 중복 확인 (변경된 경우)
    if (accountData.code && accountData.code !== account.code) {
      const accounts = await storage.getAccounts();
      const duplicate = accounts.find(a => a.code === accountData.code && a.id !== accountId);
      
      if (duplicate) {
        return res.status(400).json({ message: "이미 등록된 계정과목 코드입니다." });
      }
    }
    
    const updatedAccount = await storage.updateAccount(accountId, accountData);
    if (!updatedAccount) {
      return res.status(500).json({ message: "계정과목 정보 업데이트에 실패했습니다." });
    }
    
    await storage.addUserActivity({
      userId: req.user.id,
      action: "update",
      target: `계정과목 ${updatedAccount.name}`,
      description: JSON.stringify(req.body)
    });
    
    res.json(updatedAccount);
  } catch (error) {
    next(error);
  }
});

// 계정과목 삭제
accountingRouter.delete("/accounts/:id", checkPermission('accounts', 'delete'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const account = await storage.getAccount(id);
    const deleted = await storage.deleteAccount(id);
    if (!deleted) return res.status(404).json({ message: "계정과목을 찾을 수 없습니다." });
    await storage.addUserActivity({
      userId: req.user.id,
      action: "delete",
      target: `계정과목 ${account?.name || id}`,
      description: JSON.stringify({ id })
    });
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

// 전표 API

// 전표 목록 조회
accountingRouter.get("/vouchers", checkPermission('vouchers', 'read'), async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const vouchers = await storage.getVouchers(
      type as string | undefined, 
      status as string | undefined
    );
    
    // 거래처 정보 추가
    const vouchersWithDetails = await Promise.all(
      vouchers.map(async (voucher) => {
        let partner = null;
        if (voucher.partnerId) {
          partner = await storage.getPartner(voucher.partnerId);
        }
        // 각 전표의 항목 조회
        const items = await storage.getVoucherItems(voucher.id);
        // 각 항목에 계정명 추가
        const itemsWithAccount = await Promise.all(
          items.map(async (item) => {
            const account = await storage.getAccount(item.accountId);
            return {
              ...item,
              accountName: account?.name || null
            };
          })
        );
        return {
          ...voucher,
          partnerName: partner?.name || null,
          items: itemsWithAccount
        };
      })
    );
    
    res.json(vouchersWithDetails);
  } catch (error) {
    next(error);
  }
});

// 전표 상세 조회
accountingRouter.get("/vouchers/:id", checkPermission('vouchers', 'read'), async (req, res, next) => {
  try {
    const voucherId = parseInt(req.params.id);
    const voucher = await storage.getVoucher(voucherId);
    
    if (!voucher) {
      return res.status(404).json({ message: "전표를 찾을 수 없습니다." });
    }
    
    // 전표 항목 조회
    const voucherItems = await storage.getVoucherItems(voucherId);
    
    // 거래처 정보 조회
    let partner = null;
    if (voucher.partnerId) {
      partner = await storage.getPartner(voucher.partnerId);
    }
    
    // 계정과목 정보 추가
    const voucherItemsWithDetails = await Promise.all(
      voucherItems.map(async (item) => {
        const account = await storage.getAccount(item.accountId);
        return {
          ...item,
          accountName: account?.name || null
        };
      })
    );
    
    res.json({
      ...voucher,
      partner,
      items: voucherItemsWithDetails
    });
  } catch (error) {
    next(error);
  }
});

// 전표 등록
accountingRouter.post("/vouchers", checkPermission('vouchers', 'write'), async (req, res, next) => {
  try {
    const { voucher: voucherData, items: voucherItemsData } = req.body;
    
    // 전표 항목 검증
    if (!Array.isArray(voucherItemsData) || voucherItemsData.length === 0) {
      return res.status(400).json({ message: "전표 항목이 필요합니다." });
    }
    
    // 거래처 존재 확인
    if (voucherData.partnerId) {
      const partner = await storage.getPartner(voucherData.partnerId);
      if (!partner) {
        return res.status(400).json({ message: "존재하지 않는 거래처입니다." });
      }
    }
    
    // 계정과목 존재 확인 및 합계 검증
    let debitTotal = 0;
    let creditTotal = 0;
    for (const item of voucherItemsData) {
      const account = await storage.getAccount(item.accountId);
      if (!account) {
        return res.status(400).json({ message: `존재하지 않는 계정과목입니다: ${item.accountId}` });
      }
      if (typeof item.amount !== 'number' || item.amount === 0) {
        return res.status(400).json({ message: "금액은 0이 아니어야 합니다." });
      }
      if (item.amount > 0) {
        debitTotal += item.amount;
      } else {
        creditTotal += Math.abs(item.amount);
      }
    }
    // 차변/대변 합계 체크
    if (debitTotal !== creditTotal) {
      return res.status(400).json({
        message: "차변과 대변의 합계가 일치하지 않습니다.",
        debitTotal,
        creditTotal
      });
    }
    if (debitTotal !== voucherData.amount) {
      return res.status(400).json({
        message: "전표 금액과 차변 합계가 일치하지 않습니다.",
        voucherAmount: voucherData.amount,
        debitTotal
      });
    }
    
    // 전표 코드 생성 (자동)
    const formattedDate = new Date(voucherData.date).toISOString().slice(2, 10).replace(/-/g, '');
    const voucherType = voucherData.type === 'income' ? 'I' : voucherData.type === 'expense' ? 'E' : 'T';
    const existingVouchers = await storage.getVouchers();
    const todayVouchers = existingVouchers.filter(v => 
      v.code.startsWith(`V${voucherType}${formattedDate}`)
    );
    const serialNumber = (todayVouchers.length + 1).toString().padStart(3, '0');
    const voucherCode = `V${voucherType}${formattedDate}-${serialNumber}`;
    
    // 전표 등록
    const voucher = await storage.createVoucher(
      {
        ...voucherData,
        code: voucherCode,
        createdBy: req.user.id
      },
      voucherItemsData.map(item => ({
        ...item,
        voucherId: null // 이 값은 createVoucher에서 설정됨
      }))
    );
    
    // 전표 항목 가져오기
    const voucherItems = await storage.getVoucherItems(voucher.id);
    
    await storage.addUserActivity({
      userId: req.user.id,
      action: "create",
      target: `전표 ${voucher.code}`,
      description: "전표 등록"
    });
    
    res.status(201).json({
      ...voucher,
      items: voucherItems
    });
  } catch (error) {
    next(error);
  }
});

// 전표 수정
accountingRouter.put("/vouchers/:id", checkPermission('vouchers', 'write'), async (req, res, next) => {
  try {
    const voucherId = parseInt(req.params.id);
    const voucherData = req.body;
    // 전표 존재 확인
    const voucher = await storage.getVoucher(voucherId);
    if (!voucher) {
      return res.status(404).json({ message: "전표를 찾을 수 없습니다." });
    }
    // 전표 수정
    const updatedVoucher = await storage.updateVoucher(voucherId, voucherData);
    if (!updatedVoucher) {
      return res.status(500).json({ message: "전표 정보 업데이트에 실패했습니다." });
    }
    // 항목도 반환
    const items = await storage.getVoucherItems(voucherId);
    await storage.addUserActivity({
      userId: req.user.id,
      action: "update",
      target: `전표 ${updatedVoucher.code}`,
      description: "전표 수정"
    });
    res.json({ ...updatedVoucher, items });
  } catch (error) {
    next(error);
  }
});

// 전표 상태 업데이트
accountingRouter.put("/vouchers/:id/status", checkPermission('vouchers', 'write'), async (req, res, next) => {
  try {
    const voucherId = parseInt(req.params.id);
    const { status } = req.body;
    
    const voucher = await storage.getVoucher(voucherId);
    if (!voucher) {
      return res.status(404).json({ message: "전표를 찾을 수 없습니다." });
    }
    
    // 상태 유효성 검증
    if (!['draft', 'confirmed', 'canceled'].includes(status)) {
      return res.status(400).json({ message: "유효하지 않은 상태입니다." });
    }
    
    // 확정된 전표는 취소로만 변경 가능
    if (voucher.status === 'confirmed' && status !== 'canceled') {
      return res.status(400).json({ message: "확정된 전표는 취소 상태로만 변경할 수 있습니다." });
    }
    
    // 취소된 전표는 상태 변경 불가
    if (voucher.status === 'canceled') {
      return res.status(400).json({ message: "취소된 전표는 상태를 변경할 수 없습니다." });
    }
    
    const updatedVoucher = await storage.updateVoucher(voucherId, { status });
    
    await storage.addUserActivity({
      userId: req.user.id,
      action: "update",
      target: `전표 ${updatedVoucher.code}`,
      description: "전표 상태 변경"
    });
    
    res.json(updatedVoucher);
  } catch (error) {
    next(error);
  }
});

// 수금/지급 API

// 수금/지급 목록 조회
accountingRouter.get("/payments", checkPermission('payments', 'read'), async (req, res, next) => {
  try {
    const { partnerId } = req.query;
    const payments = await storage.getPayments(
      partnerId ? parseInt(partnerId as string) : undefined
    );
    
    // 거래처 정보 추가
    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const partner = await storage.getPartner(payment.partnerId);
        
        let transaction = null;
        if (payment.transactionId) {
          transaction = await storage.getTransaction(payment.transactionId);
        }
        
        let voucher = null;
        if (payment.voucherId) {
          voucher = await storage.getVoucher(payment.voucherId);
        }
        
        return {
          ...payment,
          partnerName: partner?.name || null,
          transactionCode: transaction?.code || null,
          voucherCode: voucher?.code || null
        };
      })
    );
    
    res.json(paymentsWithDetails);
  } catch (error) {
    next(error);
  }
});

// 수금/지급 상세 조회
accountingRouter.get("/payments/:id", checkPermission('payments', 'read'), async (req, res, next) => {
  try {
    const paymentId = parseInt(req.params.id);
    const payment = await storage.getPayment(paymentId);
    
    if (!payment) {
      return res.status(404).json({ message: "수금/지급 내역을 찾을 수 없습니다." });
    }
    
    // 관련 데이터 조회
    const partner = await storage.getPartner(payment.partnerId);
    
    let transaction = null;
    if (payment.transactionId) {
      transaction = await storage.getTransaction(payment.transactionId);
    }
    
    let voucher = null;
    if (payment.voucherId) {
      voucher = await storage.getVoucher(payment.voucherId);
    }
    
    res.json({
      ...payment,
      partner,
      transaction,
      voucher
    });
  } catch (error) {
    next(error);
  }
});

// 수금/지급 등록
accountingRouter.post("/payments", checkPermission('payments', 'write'), async (req, res, next) => {
  try {
    const paymentData = req.body;
    
    // Zod로 검증
    const validationResult = insertPaymentSchema.safeParse({
      ...paymentData,
      createdBy: req.user.id
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "입력 데이터가 유효하지 않습니다.", 
        errors: validationResult.error.errors 
      });
    }
    
    // 거래처 존재 확인
    const partner = await storage.getPartner(paymentData.partnerId);
    if (!partner) {
      return res.status(400).json({ message: "존재하지 않는 거래처입니다." });
    }
    
    // 거래 ID가 있는 경우 검증
    if (paymentData.transactionId) {
      const transaction = await storage.getTransaction(paymentData.transactionId);
      if (!transaction) {
        return res.status(400).json({ message: "존재하지 않는 거래입니다." });
      }
      
      // 거래와 거래처 일치 검증
      if (transaction.partnerId !== paymentData.partnerId) {
        return res.status(400).json({ message: "거래와 거래처가 일치하지 않습니다." });
      }
    }
    
    // 전표 ID가 있는 경우 검증
    if (paymentData.voucherId) {
      const voucher = await storage.getVoucher(paymentData.voucherId);
      if (!voucher) {
        return res.status(400).json({ message: "존재하지 않는 전표입니다." });
      }
      
      // 전표와 거래처 일치 검증 (전표에 거래처가 있는 경우)
      if (voucher.partnerId && voucher.partnerId !== paymentData.partnerId) {
        return res.status(400).json({ message: "전표와 거래처가 일치하지 않습니다." });
      }
    }
    
    const payment = await storage.createPayment({
      ...validationResult.data,
      createdBy: req.user.id
    });
    
    // 관련 데이터 추가하여 응답
    const responseData = {
      ...payment,
      partnerName: partner.name
    };
    
    await storage.addUserActivity({
      userId: req.user.id,
      action: "create",
      target: `수금/지급 ${responseData.code}`,
      description: "수금/지급 등록"
    });
    
    res.status(201).json(responseData);
  } catch (error) {
    next(error);
  }
});

// 수금/지급 전체 수정
accountingRouter.put("/payments/:id", checkPermission('payments', 'write'), async (req, res, next) => {
  try {
    const paymentId = parseInt(req.params.id);
    const paymentData = req.body;

    // 기존 데이터 확인
    const payment = await storage.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "수금/지급 내역을 찾을 수 없습니다." });
    }

    // DB 업데이트
    const updated = await storage.updatePayment(paymentId, paymentData);
    if (!updated) {
      return res.status(500).json({ message: "수정에 실패했습니다." });
    }

    await storage.addUserActivity({
      userId: req.user.id,
      action: "update",
      target: `수금/지급 ${updated.code}`,
      description: "수금/지급 수정"
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// 수금/지급 상태 업데이트
accountingRouter.put("/payments/:id/status", checkPermission('payments', 'write'), async (req, res, next) => {
  try {
    const paymentId = parseInt(req.params.id);
    const { status } = req.body;
    
    const payment = await storage.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "수금/지급 내역을 찾을 수 없습니다." });
    }
    
    // 상태 유효성 검증
    if (!['planned', 'completed'].includes(status)) {
      return res.status(400).json({ message: "유효하지 않은 상태입니다." });
    }
    
    const updatedPayment = await storage.updatePayment(paymentId, { status });
    
    await storage.addUserActivity({
      userId: req.user.id,
      action: "update",
      target: `수금/지급 ${updatedPayment.code}`,
      description: "수금/지급 상태 변경"
    });
    
    res.json(updatedPayment);
  } catch (error) {
    next(error);
  }
});

// 수금/지급 삭제
accountingRouter.delete("/payments/:id", checkPermission('payments', 'write'), async (req, res, next) => {
  try {
    const paymentId = parseInt(req.params.id);
    const payment = await storage.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "수금/지급 내역을 찾을 수 없습니다." });
    }
    const deleted = await storage.deletePayment(paymentId);
    if (!deleted) {
      return res.status(500).json({ message: "삭제에 실패했습니다." });
    }
    await storage.addUserActivity({
      userId: req.user.id,
      action: "delete",
      target: `수금/지급 ${payment.code}`,
      description: "수금/지급 삭제"
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 세금계산서 API

// 세금계산서 목록 조회
accountingRouter.get("/tax-invoices", checkPermission('tax', 'read'), async (req, res, next) => {
  try {
    const { type } = req.query;
    const taxInvoices = await storage.getTaxInvoices(type as string | undefined);
    
    // 거래처 정보 추가
    const invoicesWithDetails = await Promise.all(
      taxInvoices.map(async (invoice) => {
        const partner = await storage.getPartner(invoice.partnerId);
        
        let transaction = null;
        if (invoice.transactionId) {
          transaction = await storage.getTransaction(invoice.transactionId);
        }
        
        return {
          ...invoice,
          partnerName: partner?.name || null,
          transactionCode: transaction?.code || null
        };
      })
    );
    
    res.json(invoicesWithDetails);
  } catch (error) {
    next(error);
  }
});

// 세금계산서 상세 조회
accountingRouter.get("/tax-invoices/:id", checkPermission('tax', 'read'), async (req, res, next) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const invoice = await storage.getTaxInvoice(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ message: "세금계산서를 찾을 수 없습니다." });
    }
    
    // 관련 데이터 조회
    const partner = await storage.getPartner(invoice.partnerId);
    
    let transaction = null;
    let transactionItems = [];
    if (invoice.transactionId) {
      transaction = await storage.getTransaction(invoice.transactionId);
      transactionItems = await storage.getTransactionItems(invoice.transactionId);
      
      // 품목 정보 추가
      for (let i = 0; i < transactionItems.length; i++) {
        const item = await storage.getItem(transactionItems[i].itemId);
        transactionItems[i] = {
          ...transactionItems[i],
          itemName: item?.name || null,
          itemCode: item?.code || null
        };
      }
    }
    
    res.json({
      ...invoice,
      partner,
      transaction,
      items: transactionItems
    });
  } catch (error) {
    next(error);
  }
});

// 세금계산서 발행
accountingRouter.post("/tax-invoices", checkPermission('tax', 'write'), async (req, res, next) => {
  try {
    const invoiceData = req.body;
    
    // Zod로 검증
    const validationResult = insertTaxInvoiceSchema.safeParse({
      ...invoiceData,
      createdBy: req.user.id
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "입력 데이터가 유효하지 않습니다.", 
        errors: validationResult.error.errors 
      });
    }
    
    // 거래처 존재 확인
    const partner = await storage.getPartner(invoiceData.partnerId);
    if (!partner) {
      return res.status(400).json({ message: "존재하지 않는 거래처입니다." });
    }
    
    // 거래 ID가 있는 경우 검증
    if (invoiceData.transactionId) {
      const transaction = await storage.getTransaction(invoiceData.transactionId);
      if (!transaction) {
        return res.status(400).json({ message: "존재하지 않는 거래입니다." });
      }
      
      // 거래와 거래처 일치 검증
      if (transaction.partnerId !== invoiceData.partnerId) {
        return res.status(400).json({ message: "거래와 거래처가 일치하지 않습니다." });
      }
      
      // 거래 유형과 세금계산서 유형 일치 검증
      if (
        (transaction.type === 'sale' && invoiceData.type !== 'issue') ||
        (transaction.type === 'purchase' && invoiceData.type !== 'receive')
      ) {
        return res.status(400).json({ message: "거래 유형과 세금계산서 유형이 일치하지 않습니다." });
      }
    }
    
    // 세금계산서 코드 생성 (자동)
    const formattedDate = new Date(invoiceData.date).toISOString().slice(2, 10).replace(/-/g, '');
    const invoiceType = invoiceData.type === 'issue' ? 'I' : 'R';
    const existingInvoices = await storage.getTaxInvoices();
    const todayInvoices = existingInvoices.filter(i => 
      i.code.startsWith(`T${invoiceType}${formattedDate}`)
    );
    const serialNumber = (todayInvoices.length + 1).toString().padStart(3, '0');
    const invoiceCode = `T${invoiceType}${formattedDate}-${serialNumber}`;
    
    const taxInvoice = await storage.createTaxInvoice({
      ...validationResult.data,
      code: invoiceCode,
      createdBy: req.user.id
    });
    
    // 관련 데이터 추가하여 응답
    const responseData = {
      ...taxInvoice,
      partnerName: partner.name
    };
    
    await storage.addUserActivity({
      userId: req.user.id,
      action: "create",
      target: `세금계산서 ${responseData.code}`,
      description: "세금계산서 등록"
    });
    
    res.status(201).json(responseData);
  } catch (error) {
    next(error);
  }
});

// 세금계산서 상태 업데이트 (PATCH도 지원)
accountingRouter.patch("/tax-invoices/:id/status", checkPermission('tax', 'write'), async (req, res, next) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const { status } = req.body;
    const invoice = await storage.getTaxInvoice(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "세금계산서를 찾을 수 없습니다." });
    }
    // 상태 유효성 검증
    if (!['issued', 'canceled'].includes(status)) {
      return res.status(400).json({ message: "유효하지 않은 상태입니다." });
    }
    const updatedInvoice = await storage.updateTaxInvoice(invoiceId, { status });
    await storage.addUserActivity({
      userId: req.user.id,
      action: "update",
      target: `세금계산서 ${updatedInvoice.code}`,
      description: "세금계산서 상태 변경"
    });
    res.json(updatedInvoice);
  } catch (error) {
    next(error);
  }
});

// 세금계산서 삭제
accountingRouter.delete("/tax-invoices/:id", checkPermission('tax', 'delete'), async (req, res, next) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const invoice = await storage.getTaxInvoice(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "세금계산서를 찾을 수 없습니다." });
    }
    const deleted = await storage.deleteTaxInvoice(invoiceId);
    if (!deleted) {
      return res.status(500).json({ message: "세금계산서 삭제에 실패했습니다." });
    }
    await storage.addUserActivity({
      userId: req.user.id,
      action: "delete",
      target: `세금계산서 ${invoice.code}`,
      description: "세금계산서 삭제"
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// 세금계산서 부분 수정
accountingRouter.patch("/tax-invoices/:id", checkPermission('tax', 'write'), async (req, res, next) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const updateData = req.body;
    const invoice = await storage.getTaxInvoice(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "세금계산서를 찾을 수 없습니다." });
    }
    const updatedInvoice = await storage.updateTaxInvoice(invoiceId, updateData);
    if (!updatedInvoice) {
      return res.status(500).json({ message: "세금계산서 정보 업데이트에 실패했습니다." });
    }
    await storage.addUserActivity({
      userId: req.user.id,
      action: "update",
      target: `세금계산서 ${updatedInvoice.code}`,
      description: "세금계산서 부분 수정"
    });
    res.json(updatedInvoice);
  } catch (error) {
    next(error);
  }
});

// 손익계산서 API
accountingRouter.get("/statements/income", checkPermission('statements', 'read'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    // 예시: 매출/비용 계정과목별 집계 (실제 로직은 상세화 필요)
    const revenue = await storage.getAccountSums('revenue', from as string, to as string);
    const expenses = await storage.getAccountSums('expense', from as string, to as string);
    const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    res.json({ revenue, totalRevenue, expenses, totalExpenses });
  } catch (error) { next(error); }
});

// 재무상태표 API
accountingRouter.get("/statements/balance", checkPermission('statements', 'read'), async (req, res, next) => {
  try {
    const { date } = req.query;
    // 예시: 자산/부채/자본 계정과목별 집계 (실제 로직은 상세화 필요)
    const currentAssets = await storage.getAccountSums('asset', null, date as string, { current: true });
    const nonCurrentAssets = await storage.getAccountSums('asset', null, date as string, { current: false });
    const currentLiabilities = await storage.getAccountSums('liability', null, date as string, { current: true });
    const nonCurrentLiabilities = await storage.getAccountSums('liability', null, date as string, { current: false });
    const equity = await storage.getAccountSums('equity', null, date as string);
    res.json({ currentAssets, nonCurrentAssets, currentLiabilities, nonCurrentLiabilities, equity });
  } catch (error) { next(error); }
});

// 현금흐름표 API
accountingRouter.get("/statements/cashflow", checkPermission('statements', 'read'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    // 예시: 간단 집계 (실제 로직은 상세화 필요)
    const beginningCash = await storage.getBeginningCash(from as string);
    const operatingActivities = await storage.getCashFlow('operating', from as string, to as string);
    const investingActivities = await storage.getCashFlow('investing', from as string, to as string);
    const financingActivities = await storage.getCashFlow('financing', from as string, to as string);
    res.json({ beginningCash, operatingActivities, investingActivities, financingActivities });
  } catch (error) { next(error); }
});

// 월별 매출/비용 차트 API
accountingRouter.get("/monthly", checkPermission('statements', 'read'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.json([]);
    const result = await storage.getMonthlyRevenueExpenses(from as string, to as string);
    res.json(result);
  } catch (error) { next(error); }
});
