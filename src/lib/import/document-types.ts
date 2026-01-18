// OCR ドキュメント型定義

import { ExpenseCategory, DeductionType, FilingType, PurchaseInvoiceOCRResult } from '@/lib/types';

// ドキュメントタイプ
export type DocumentType = 'receipt' | 'bank_statement' | 'tax_return' | 'purchase_invoice';

// 仕入れ伝票OCR結果を再エクスポート
export type { PurchaseInvoiceOCRResult } from '@/lib/types';

// レシート OCR 結果
export interface ReceiptOCRResult {
    success: boolean;
    merchant: string | null;
    date: string | null;              // YYYY-MM-DD
    totalAmount: number | null;
    taxAmount?: number | null;        // 消費税額
    items?: Array<{
        name: string;
        quantity?: number;
        unitPrice?: number;
        price: number;
    }>;
    suggestedCategory: ExpenseCategory | null;
    confidence: number;               // 0-100
    notes?: string;
    error?: string;
}

// 通帳/銀行明細 OCR 結果
export interface BankStatementOCRResult {
    success: boolean;
    bankName: string | null;
    branchName?: string | null;
    accountType?: 'ordinary' | 'savings' | 'checking';  // 普通/貯蓄/当座
    accountNumber?: string | null;    // 一部マスク
    transactions: Array<{
        date: string;                 // YYYY-MM-DD
        description: string;
        amount: number;               // 出金はマイナス
        balance?: number;
        isDeposit: boolean;           // 入金 true, 出金 false
    }>;
    confidence: number;
    error?: string;
}

// 確定申告書 OCR 結果
export interface TaxReturnOCRResult {
    success: boolean;
    fiscalYear: number | null;
    filingType: FilingType | null;

    // 収入
    businessIncome: number | null;    // 事業所得
    salaryIncome: number | null;      // 給与所得
    miscIncome?: number | null;       // 雑所得

    // 経費（青色申告決算書から）
    expenses?: Partial<Record<string, number>>;
    totalExpenses?: number | null;

    // 控除
    deductions: Partial<Record<DeductionType, number>>;

    // 税額
    taxableIncome: number | null;
    totalTax: number | null;
    withholdingTax?: number | null;   // 源泉徴収税額
    finalTax?: number | null;         // 納付/還付額

    confidence: number;
    error?: string;
}

// 汎用 OCR 結果
export type OCRResult = ReceiptOCRResult | BankStatementOCRResult | TaxReturnOCRResult | PurchaseInvoiceOCRResult;

// OCR リクエスト
export interface OCRRequest {
    imageBase64: string;
    documentType: DocumentType;
    hints?: {
        expectedMerchant?: string;
        expectedDate?: string;
        fiscalYear?: number;
    };
}

// OCR レスポンス（API用）
export interface OCRResponse {
    success: boolean;
    documentType: DocumentType;
    result: OCRResult;
    processingTime: number;           // ミリ秒
    error?: string;
}
