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

// 減価償却資産
export interface DepreciationAsset {
    name: string;                      // 資産名（例：軽トラック、レジスター）
    acquisitionDate?: string | null;   // 取得日 YYYY-MM-DD
    acquisitionCost: number;           // 取得価額
    usefulLife?: number | null;        // 耐用年数
    depreciationMethod?: 'straight_line' | 'declining_balance' | null; // 定額法/定率法
    currentYearDepreciation?: number | null;  // 今年の償却額
    accumulatedDepreciation?: number | null;  // 累計償却額
    bookValue?: number | null;         // 期末簿価
}

// 期末資産（貸借対照表）
export interface BalanceSheetAssets {
    // 流動資産
    cash?: number | null;              // 現金
    deposits?: number | null;          // 預金
    accountsReceivable?: number | null; // 売掛金
    inventory?: number | null;         // 棚卸資産（商品・製品）
    supplies?: number | null;          // 貯蔵品
    prepaidExpenses?: number | null;   // 前払費用
    otherCurrentAssets?: number | null; // その他流動資産

    // 固定資産（減価償却資産は別途）
    land?: number | null;              // 土地
    buildings?: number | null;         // 建物（期末簿価）
    machinery?: number | null;         // 機械装置（期末簿価）
    vehicles?: number | null;          // 車両運搬具（期末簿価）
    equipment?: number | null;         // 工具器具備品（期末簿価）
    otherFixedAssets?: number | null;  // その他固定資産

    // 負債
    accountsPayable?: number | null;   // 買掛金
    unpaidExpenses?: number | null;    // 未払金
    loans?: number | null;             // 借入金
    otherLiabilities?: number | null;  // その他負債

    // 元入金（資本）
    capital?: number | null;           // 元入金
}

// 確定申告書 OCR 結果
export interface TaxReturnOCRResult {
    success: boolean;
    fiscalYear: number | null;
    filingType: FilingType | null;

    // 納税者基本情報
    taxpayerName?: string | null;      // 納税者氏名
    taxpayerAddress?: string | null;   // 住所
    businessName?: string | null;      // 屋号
    businessType?: string | null;      // 業種（例：小売業、飲食業）

    // 収入
    businessIncome: number | null;    // 事業所得
    salaryIncome: number | null;      // 給与所得
    miscIncome?: number | null;       // 雑所得
    grossRevenue?: number | null;     // 売上高（収入金額）

    // 経費（青色申告決算書から）
    expenses?: Partial<Record<string, number>>;
    totalExpenses?: number | null;

    // 減価償却資産
    depreciationAssets?: DepreciationAsset[];

    // 期末資産（貸借対照表）
    balanceSheet?: BalanceSheetAssets;

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
