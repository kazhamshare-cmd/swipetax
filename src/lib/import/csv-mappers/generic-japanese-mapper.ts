// 汎用日本語 CSV マッパー
// 一般的な日本語ヘッダーに対応

import { CSVMapper, CSVMapperConfig, MappedTransaction } from './types';

const config: CSVMapperConfig = {
    serviceId: 'custom',
    serviceName: 'Generic Japanese',
    serviceNameJa: '汎用日本語CSV',
    expectedHeaders: ['日付', '金額'],
    columnMapping: {
        date: ['日付', '取引日', '年月日', '発生日', '決済日'],
        amount: ['金額', '支出金額', '支払金額', '出金', '入金額', '出金額'],
        merchant: ['摘要', '取引先', '相手先', '名称', '店舗名', '支払先'],
        description: ['メモ', '備考', '内容', '詳細', 'コメント'],
    },
    dateFormat: 'YYYY-MM-DD',
    encoding: 'UTF-8',
};

// ヘッダー検出
function detect(headers: string[]): boolean {
    const headerSet = new Set(headers.map(h => h.trim()));

    // 日付と金額のカラムが必要
    const dateColumns = config.columnMapping.date as string[];
    const amountColumns = config.columnMapping.amount as string[];

    const hasDate = dateColumns.some(col => headerSet.has(col));
    const hasAmount = amountColumns.some(col => headerSet.has(col));

    return hasDate && hasAmount;
}

// カラム名を探す
function findColumn(headers: string[], candidates: string | string[]): string | undefined {
    const candidateList = Array.isArray(candidates) ? candidates : [candidates];
    for (const candidate of candidateList) {
        if (headers.includes(candidate)) {
            return candidate;
        }
    }
    return undefined;
}

// 日付パース
function parseDate(dateStr: string): string {
    if (!dateStr) return '';

    // YYYY-MM-DD, YYYY/MM/DD, YYYY年MM月DD日 に対応
    const cleaned = dateStr.trim()
        .replace(/\//g, '-')
        .replace(/年/g, '-')
        .replace(/月/g, '-')
        .replace(/日/g, '');

    const match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        const [, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return cleaned;
}

// 金額パース
function parseAmount(amountStr: string): number {
    if (!amountStr) return 0;

    const cleaned = amountStr.replace(/[,円¥\s]/g, '');
    const isNegative = /^[-▲△]/.test(cleaned) || /[-▲△]$/.test(cleaned);
    const numStr = cleaned.replace(/[-▲△]/g, '');

    const amount = parseInt(numStr, 10);
    return isNegative ? -amount : amount;
}

// 行マッピング
function map(row: Record<string, string>): MappedTransaction | null {
    const headers = Object.keys(row);

    // 各カラムを特定
    const dateCol = findColumn(headers, config.columnMapping.date);
    const amountCol = findColumn(headers, config.columnMapping.amount);
    const merchantCol = findColumn(headers, config.columnMapping.merchant);
    const descCol = config.columnMapping.description
        ? findColumn(headers, config.columnMapping.description)
        : undefined;

    if (!dateCol || !amountCol) {
        return null;
    }

    const date = parseDate(row[dateCol]);
    const amount = parseAmount(row[amountCol]);

    // 摘要がなければ金額カラムの隣のカラムを使う
    const merchant = merchantCol
        ? row[merchantCol]?.trim()
        : Object.values(row).find(v => v && v !== row[dateCol] && v !== row[amountCol])?.trim() || '';

    const description = descCol ? row[descCol]?.trim() : undefined;

    if (!date || amount === 0 || !merchant) {
        return null;
    }

    return {
        date,
        amount: Math.abs(amount),
        merchant,
        description,
        rawData: row,
    };
}

export const genericJapaneseMapper: CSVMapper = {
    config,
    detect,
    map,
};
