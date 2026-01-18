// ============================================
// SwipeTax 型定義
// ============================================

// ユーザーの事業形態
export type BusinessType = 'employee_side' | 'freelance' | 'sole_proprietor';

// ============================================
// 年金受給者対応（Phase C）
// ============================================

// 収入種別
export type IncomeType = 'business' | 'salary' | 'pension' | 'miscellaneous';

// 年金の種類
export type PensionType = 'kosei' | 'kokumin' | 'kyosai' | 'corporate' | 'ideco' | 'other';

// 年金タイプの表示情報
export const PENSION_TYPE_INFO: Record<PensionType, { nameJa: string; description: string }> = {
  kosei: { nameJa: '厚生年金', description: '会社員・公務員が加入' },
  kokumin: { nameJa: '国民年金', description: '基礎年金' },
  kyosai: { nameJa: '共済年金', description: '公務員・教職員' },
  corporate: { nameJa: '企業年金', description: '厚生年金基金・確定給付企業年金' },
  ideco: { nameJa: 'iDeCo', description: '個人型確定拠出年金' },
  other: { nameJa: 'その他', description: 'その他の年金' },
};

// 収入種別の表示情報
export const INCOME_TYPE_INFO: Record<IncomeType, { nameJa: string; description: string; emoji: string }> = {
  business: { nameJa: '事業', description: '事業所得・売上', emoji: '💼' },
  salary: { nameJa: '給与', description: 'アルバイト・パート収入', emoji: '💰' },
  pension: { nameJa: '年金', description: '公的年金等', emoji: '🏛️' },
  miscellaneous: { nameJa: 'その他', description: '雑所得など', emoji: '📝' },
};

// 収入エントリー（統一フォーマット）
export interface IncomeEntry {
  id: string;
  userId: string;
  fiscalYear: number;
  incomeType: IncomeType;
  date: string;             // YYYY-MM-DD
  amount: number;
  sourceName: string;       // 支払元名称
  withholdingTax?: number;  // 源泉徴収税額
  pensionType?: PensionType;
  salaryMonth?: string;     // 給与の対象月 YYYY-MM
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// 仮想通貨（暗号資産）対応
// ============================================

// 仮想通貨の取引種別
export type CryptoTransactionType = 'buy' | 'sell' | 'exchange' | 'receive';

// 仮想通貨の種類（よく使われるもの）
export type CryptoCurrency = 'BTC' | 'ETH' | 'XRP' | 'SOL' | 'DOGE' | 'OTHER';

// 仮想通貨の表示情報
export const CRYPTO_CURRENCY_INFO: Record<CryptoCurrency, { name: string; nameJa: string }> = {
  BTC: { name: 'Bitcoin', nameJa: 'ビットコイン' },
  ETH: { name: 'Ethereum', nameJa: 'イーサリアム' },
  XRP: { name: 'Ripple', nameJa: 'リップル' },
  SOL: { name: 'Solana', nameJa: 'ソラナ' },
  DOGE: { name: 'Dogecoin', nameJa: 'ドージコイン' },
  OTHER: { name: 'Other', nameJa: 'その他' },
};

// 取引種別の表示情報
export const CRYPTO_TRANSACTION_TYPE_INFO: Record<CryptoTransactionType, { nameJa: string; description: string }> = {
  buy: { nameJa: '購入', description: '日本円で仮想通貨を購入' },
  sell: { nameJa: '売却', description: '仮想通貨を日本円に換金' },
  exchange: { nameJa: '交換', description: '仮想通貨同士の交換（課税対象）' },
  receive: { nameJa: '受取', description: 'エアドロップ・マイニング報酬等' },
};

// 仮想通貨取引エントリー
export interface CryptoEntry {
  id: string;
  userId: string;
  fiscalYear: number;
  transactionType: CryptoTransactionType;
  date: string;               // YYYY-MM-DD
  exchange: string;           // 取引所名（bitFlyer, Coincheck等）
  currency: CryptoCurrency;
  customCurrencyName?: string; // OTHERの場合の通貨名
  quantity: number;           // 数量
  pricePerUnit: number;       // 単価（円）
  totalAmount: number;        // 合計金額（円）
  fee?: number;               // 手数料（円）
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// 仮想通貨の損益計算結果
export interface CryptoGainResult {
  currency: CryptoCurrency;
  customCurrencyName?: string;
  totalBought: number;        // 購入総額
  totalSold: number;          // 売却総額
  totalQuantityBought: number;
  totalQuantitySold: number;
  averageCost: number;        // 平均取得単価
  realizedGain: number;       // 実現損益
  unrealizedQuantity: number; // 未売却数量
}

// 申告種別
export type FilingType = 'white' | 'blue_simple' | 'blue_regular' | 'blue_etax';

// 申告種別の表示情報
export const FILING_TYPE_INFO: Record<FilingType, { nameJa: string; description: string; blueDeduction: number }> = {
  white: {
    nameJa: '白色申告',
    description: '簡易な記帳で済む申告方法',
    blueDeduction: 0
  },
  blue_simple: {
    nameJa: '青色申告（簡易簿記）',
    description: '10万円の特別控除',
    blueDeduction: 100000
  },
  blue_regular: {
    nameJa: '青色申告（複式簿記）',
    description: '55万円の特別控除',
    blueDeduction: 550000
  },
  blue_etax: {
    nameJa: '青色申告（e-Tax）',
    description: '65万円の特別控除（電子申告）',
    blueDeduction: 650000
  },
};

// 取引ステータス
export type TransactionStatus = 'pending' | 'approved' | 'modified' | 'held' | 'excluded';

// データソース
export type DataSource = 'csv' | 'ocr' | 'manual' | 'api';

// 経費カテゴリ（勘定科目）
export type ExpenseCategory =
  | 'travel'            // 旅費交通費
  | 'communication'     // 通信費
  | 'entertainment'     // 接待交際費
  | 'supplies'          // 消耗品費
  | 'books'             // 新聞図書費
  | 'advertising'       // 広告宣伝費
  | 'outsourcing'       // 外注費
  | 'rent'              // 地代家賃
  | 'utilities'         // 水道光熱費
  | 'fees'              // 支払手数料
  | 'insurance'         // 保険料
  | 'depreciation'      // 減価償却費
  | 'miscellaneous';    // 雑費

// 控除種別
export type DeductionType =
  | 'medical'           // 医療費控除
  | 'social_insurance'  // 社会保険料控除
  | 'life_insurance'    // 生命保険料控除
  | 'earthquake_insurance' // 地震保険料控除
  | 'donation'          // 寄附金控除
  | 'mortgage'          // 住宅ローン控除
  | 'spouse'            // 配偶者控除
  | 'dependent'         // 扶養控除
  | 'basic';            // 基礎控除

// ============================================
// メインエンティティ
// ============================================

// ユーザー情報
export interface TaxUser {
  id: string;
  email: string;
  name?: string;
  businessType: BusinessType;
  filingType: FilingType;
  fiscalYear: number;

  // 基本情報
  address?: string;
  birthDate?: string;
  // myNumber は暗号化して別途保存

  // 事業情報
  businessName?: string;
  businessCategory?: string;
  businessStartDate?: string;

  // 設定
  defaultCategories?: Record<string, ExpenseCategory>; // merchant -> category マッピング

  createdAt: number;
  updatedAt: number;
}

// 取引データ
export interface Transaction {
  id: string;
  userId: string;
  fiscalYear: number;

  // 取引情報
  date: string;           // YYYY-MM-DD
  amount: number;         // 金額（正: 支出、負: 収入）
  merchant: string;       // 取引先名
  description?: string;   // 摘要

  // 仕分け結果
  status: TransactionStatus;
  category?: ExpenseCategory;
  userNote?: string;      // ユーザーメモ

  // AI判定
  aiCategory?: ExpenseCategory;
  aiConfidence?: number;  // 0-100
  aiReasoning?: string;

  // メタデータ
  source: DataSource;
  sourceFile?: string;
  receiptImage?: string;

  createdAt: number;
  updatedAt: number;
}

// 控除情報
export interface Deduction {
  id: string;
  userId: string;
  fiscalYear: number;

  type: DeductionType;
  amount: number;
  details?: Record<string, unknown>;

  createdAt: number;
  updatedAt: number;
}

// 申告書データ
export interface TaxReturn {
  id: string;
  userId: string;
  fiscalYear: number;

  // 収入
  businessIncome: number;     // 事業収入
  salaryIncome?: number;      // 給与収入
  otherIncome?: number;       // その他収入

  // 経費
  expenses: Partial<Record<ExpenseCategory, number>>;
  totalExpenses: number;

  // 所得
  businessProfit: number;     // 事業所得 = 事業収入 - 経費
  totalIncome: number;        // 合計所得

  // 控除
  deductions: Partial<Record<DeductionType, number>>;
  totalDeductions: number;

  // 税額
  taxableIncome: number;      // 課税所得 = 所得 - 控除
  incomeTax: number;          // 所得税
  specialReconstructionTax: number; // 復興特別所得税
  totalTax: number;           // 合計税額

  // 納付/還付
  withholdingTax: number;     // 源泉徴収税額
  prepaidTax: number;         // 予定納税額
  finalTax: number;           // 最終納付/還付額（正: 納付、負: 還付）

  status: 'draft' | 'completed' | 'submitted';
  submittedAt?: number;

  createdAt: number;
  updatedAt: number;
}

// ============================================
// UI用の型
// ============================================

// スワイプ方向
export type SwipeDirection = 'right' | 'left' | 'up' | 'down';

// スワイプアクション結果
export interface SwipeAction {
  direction: SwipeDirection;
  transaction: Transaction;
  newStatus: TransactionStatus;
  newCategory?: ExpenseCategory;
}

// カテゴリ表示情報
export interface CategoryInfo {
  id: ExpenseCategory;
  nameJa: string;
  nameEn: string;
  icon: string;
  emoji: string;
  color: string;
  description: string;
}

// CSV取り込み結果
export interface CSVImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: string[];
  transactions: Transaction[];
}

// AI判定リクエスト
export interface AICategorizationRequest {
  merchant: string;
  amount: number;
  date: string;
  description?: string;
  businessType: BusinessType;
  previousJudgments?: Array<{
    merchant: string;
    category: ExpenseCategory;
  }>;
}

// AI判定レスポンス
export interface AICategorizationResponse {
  category: ExpenseCategory;
  confidence: number;
  reasoning: string;
  isBusinessExpense: boolean;
}

// ============================================
// 定数
// ============================================

export const EXPENSE_CATEGORIES: CategoryInfo[] = [
  { id: 'travel', nameJa: '旅費交通費', nameEn: 'Travel', icon: 'Train', emoji: '🚃', color: '#3B82F6', description: '電車、タクシー、飛行機など' },
  { id: 'communication', nameJa: '通信費', nameEn: 'Communication', icon: 'Phone', emoji: '📱', color: '#8B5CF6', description: '携帯電話、インターネット' },
  { id: 'entertainment', nameJa: '接待交際費', nameEn: 'Entertainment', icon: 'Users', emoji: '🍽️', color: '#EC4899', description: '会食、贈答品' },
  { id: 'supplies', nameJa: '消耗品費', nameEn: 'Supplies', icon: 'Package', emoji: '📦', color: '#F59E0B', description: '文具、備品（10万円未満）' },
  { id: 'books', nameJa: '新聞図書費', nameEn: 'Books', icon: 'BookOpen', emoji: '📚', color: '#10B981', description: '書籍、雑誌、新聞' },
  { id: 'advertising', nameJa: '広告宣伝費', nameEn: 'Advertising', icon: 'Megaphone', emoji: '📢', color: '#EF4444', description: '広告、宣伝' },
  { id: 'outsourcing', nameJa: '外注費', nameEn: 'Outsourcing', icon: 'Briefcase', emoji: '💼', color: '#6366F1', description: '業務委託、外注' },
  { id: 'rent', nameJa: '地代家賃', nameEn: 'Rent', icon: 'Home', emoji: '🏠', color: '#14B8A6', description: '事務所家賃（按分）' },
  { id: 'utilities', nameJa: '水道光熱費', nameEn: 'Utilities', icon: 'Zap', emoji: '💡', color: '#F97316', description: '電気、ガス、水道（按分）' },
  { id: 'fees', nameJa: '支払手数料', nameEn: 'Fees', icon: 'CreditCard', emoji: '💳', color: '#64748B', description: '振込手数料、決済手数料' },
  { id: 'insurance', nameJa: '保険料', nameEn: 'Insurance', icon: 'Shield', emoji: '🛡️', color: '#0EA5E9', description: '事業用保険' },
  { id: 'depreciation', nameJa: '減価償却費', nameEn: 'Depreciation', icon: 'TrendingDown', emoji: '📉', color: '#84CC16', description: '固定資産の償却' },
  { id: 'miscellaneous', nameJa: '雑費', nameEn: 'Miscellaneous', icon: 'MoreHorizontal', emoji: '📝', color: '#9CA3AF', description: 'その他の経費' },
];

// 所得税率テーブル（2024年）
export const INCOME_TAX_BRACKETS = [
  { min: 0, max: 1950000, rate: 0.05, deduction: 0 },
  { min: 1950000, max: 3300000, rate: 0.10, deduction: 97500 },
  { min: 3300000, max: 6950000, rate: 0.20, deduction: 427500 },
  { min: 6950000, max: 9000000, rate: 0.23, deduction: 636000 },
  { min: 9000000, max: 18000000, rate: 0.33, deduction: 1536000 },
  { min: 18000000, max: 40000000, rate: 0.40, deduction: 2796000 },
  { min: 40000000, max: Infinity, rate: 0.45, deduction: 4796000 },
];

// 基礎控除額（所得2,400万円以下の場合）
export const BASIC_DEDUCTION = 480000;

// 基礎控除額（所得金額による段階的減額）
export const BASIC_DEDUCTION_BRACKETS = [
  { maxIncome: 24000000, deduction: 480000 },  // 2,400万円以下
  { maxIncome: 24500000, deduction: 320000 },  // 2,450万円以下
  { maxIncome: 25000000, deduction: 160000 },  // 2,500万円以下
  { maxIncome: Infinity, deduction: 0 },        // 2,500万円超
];

// 青色申告特別控除額
export const BLUE_RETURN_DEDUCTIONS = {
  white: 0,              // 白色申告: 控除なし
  blue_simple: 100000,   // 青色申告（簡易簿記）: 10万円
  blue_regular: 550000,  // 青色申告（複式簿記）: 55万円
  blue_etax: 650000,     // 青色申告（e-Tax/電子帳簿）: 65万円
} as const;

// 復興特別所得税率
export const SPECIAL_RECONSTRUCTION_TAX_RATE = 0.021;

// ============================================
// サブスクリプション関連
// ============================================

export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'expired' | 'cancelled';

export interface SubscriptionData {
  userId?: string;
  status: SubscriptionStatus;
  plan?: 'basic' | 'pro';
  productId?: string;
  expiresAt?: number;
  expirationDate?: number;
  trialEndsAt?: number;
  purchaseDate?: number;
  customerId?: string;
  willRenew?: boolean;
  isActive?: boolean;
  platform?: 'ios' | 'android' | 'web';
  originalTransactionId?: string;
}

// ユーザー設定
export interface UserSettings {
  language: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  defaultBusinessType?: BusinessType;
  defaultFilingType?: FilingType;
}

// ============================================
// 飲食店向け機能
// ============================================

// 従業員タイプ
export type EmployeeType = 'part_time' | 'full_time';

// 支払い方法
export type PaymentMethod = 'cash' | 'credit_card' | 'electronic' | 'mixed';

// 給与情報
export interface PayrollEntry {
  id: string;
  userId: string;
  fiscalYear: number;
  employeeName: string;
  employeeType: EmployeeType;
  position?: string;
  paymentDate: string;        // YYYY-MM-DD
  paymentMonth: string;       // YYYY-MM
  workHours?: number;         // アルバイト用
  hourlyRate?: number;        // アルバイト用
  baseSalary?: number;        // 社員用
  grossAmount: number;        // 総支給額
  deductions?: {
    incomeTax?: number;
    healthInsurance?: number;
    pensionInsurance?: number;
    employmentInsurance?: number;
    other?: number;
  };
  netAmount: number;          // 手取り
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// 売上情報
export interface SalesEntry {
  id: string;
  userId: string;
  fiscalYear: number;
  date: string;               // YYYY-MM-DD
  amount: number;
  paymentMethod: PaymentMethod;
  customerCount?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// 仕入れ品目
export interface PurchaseItem {
  name: string;
  category?: 'vegetables' | 'meat' | 'seafood' | 'seasonings' | 'other';
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  price: number;
}

// 仕入れOCR結果
export interface PurchaseInvoiceOCRResult {
  success: boolean;
  supplierName: string | null;
  invoiceNumber?: string | null;
  date: string | null;
  items: PurchaseItem[];
  subtotal?: number | null;
  taxAmount?: number | null;
  totalAmount: number | null;
  suggestedCategory: 'supplies';
  confidence: number;
  error?: string;
}

// 仕入れデータ
export interface PurchaseEntry {
  id: string;
  userId: string;
  fiscalYear: number;
  supplierName: string;
  invoiceNumber?: string;
  date: string;               // YYYY-MM-DD
  items: PurchaseItem[];
  subtotal?: number;
  taxAmount?: number;
  totalAmount: number;
  receiptImage?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
