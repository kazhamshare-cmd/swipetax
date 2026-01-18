// CSV マッパー型定義

import { ExpenseCategory } from '@/lib/types';

// サービス識別子
export type AccountingServiceId = 'freee' | 'moneyforward' | 'yayoi' | 'custom';

// CSV カラムマッピング設定
export interface CSVColumnMapping {
    date: string | string[];           // 日付カラム名
    amount: string | string[];         // 金額カラム名
    merchant: string | string[];       // 取引先カラム名
    description?: string | string[];   // 摘要カラム名
    category?: string | string[];      // カテゴリカラム名（存在する場合）
}

// CSV マッパー設定
export interface CSVMapperConfig {
    serviceId: AccountingServiceId;
    serviceName: string;
    serviceNameJa: string;
    expectedHeaders: string[];         // 自動判定用の必須ヘッダー
    columnMapping: CSVColumnMapping;
    dateFormat: string;                // 例: 'YYYY/MM/DD', 'YYYY-MM-DD'
    encoding?: 'UTF-8' | 'Shift_JIS';
    skipRows?: number;                 // スキップする先頭行数
}

// マッピング済み取引データ
export interface MappedTransaction {
    date: string;           // YYYY-MM-DD 形式
    amount: number;
    merchant: string;
    description?: string;
    originalCategory?: string;
    rawData: Record<string, string>;
}

// CSV パース結果
export interface CSVParseResult {
    success: boolean;
    serviceDetected?: AccountingServiceId;
    serviceName?: string;
    requiresManualMapping?: boolean;
    headers?: string[];
    sampleRows?: Record<string, string>[];
    transactions?: MappedTransaction[];
    totalRows: number;
    importedRows?: number;
    skippedRows?: number;
    errors: string[];
}

// CSV マッパーインターフェース
export interface CSVMapper {
    config: CSVMapperConfig;
    detect(headers: string[]): boolean;
    map(row: Record<string, string>): MappedTransaction | null;
}

// カテゴリマッピング（会計ソフトのカテゴリ → SwipeTax カテゴリ）
export const CATEGORY_MAPPING: Record<string, ExpenseCategory> = {
    // freee
    '旅費交通費': 'travel',
    '通信費': 'communication',
    '接待交際費': 'entertainment',
    '消耗品費': 'supplies',
    '新聞図書費': 'books',
    '広告宣伝費': 'advertising',
    '外注費': 'outsourcing',
    '地代家賃': 'rent',
    '水道光熱費': 'utilities',
    '支払手数料': 'fees',
    '保険料': 'insurance',
    '減価償却費': 'depreciation',
    '雑費': 'miscellaneous',

    // Money Forward の大項目
    '交通費': 'travel',
    '食費': 'entertainment',
    '日用品': 'supplies',
    '教養・教育': 'books',
    '趣味・娯楽': 'miscellaneous',

    // 弥生会計（'交通費'は上で定義済み）
    '通信運搬費': 'communication',
    '交際費': 'entertainment',
    '事務用品費': 'supplies',
    '図書費': 'books',
};
