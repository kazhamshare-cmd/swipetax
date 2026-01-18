// Money Forward CSV マッパー

import { CSVMapper, CSVMapperConfig, MappedTransaction } from './types';

/**
 * Money Forward の明細データ CSV 形式
 *
 * 想定カラム:
 * 日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID
 *
 * または:
 * 計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID
 */
export const moneyforwardMapperConfig: CSVMapperConfig = {
    serviceId: 'moneyforward',
    serviceName: 'Money Forward',
    serviceNameJa: 'マネーフォワード',
    expectedHeaders: ['日付', '内容', '金額（円）', '大項目'],
    columnMapping: {
        date: ['日付'],
        amount: ['金額（円）', '金額'],
        merchant: ['内容'],
        description: ['メモ'],
        category: ['大項目', '中項目'],
    },
    dateFormat: 'YYYY/MM/DD',
    encoding: 'UTF-8',
};

function parseDate(dateStr: string): string {
    if (!dateStr) return '';

    const cleaned = dateStr.trim().replace(/\//g, '-');

    const match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        const [, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return cleaned;
}

function parseAmount(amountStr: string): number {
    if (!amountStr) return 0;

    const cleaned = amountStr.replace(/[,円¥\s]/g, '');
    const isNegative = /^[-▲△]/.test(cleaned) || /[-▲△]$/.test(cleaned);
    const numStr = cleaned.replace(/[-▲△]/g, '');

    const amount = parseInt(numStr, 10);
    return isNegative ? -amount : amount;
}

function getColumnValue(row: Record<string, string>, columns: string | string[]): string {
    const columnNames = Array.isArray(columns) ? columns : [columns];

    for (const col of columnNames) {
        if (row[col] !== undefined && row[col] !== '') {
            return row[col];
        }
    }

    return '';
}

export const moneyforwardMapper: CSVMapper = {
    config: moneyforwardMapperConfig,

    detect(headers: string[]): boolean {
        const requiredHeaders = moneyforwardMapperConfig.expectedHeaders;
        const headerSet = new Set(headers.map(h => h.trim()));

        // 必須ヘッダーの少なくとも3つが含まれていれば MF と判定
        const matchCount = requiredHeaders.filter(h => headerSet.has(h)).length;

        // "金額（円）" は特徴的なのでこれがあれば優先判定
        if (headerSet.has('金額（円）') && headerSet.has('大項目')) {
            return true;
        }

        return matchCount >= 3;
    },

    map(row: Record<string, string>): MappedTransaction | null {
        const { columnMapping } = moneyforwardMapperConfig;

        // 振替（内部移動）は除外
        if (row['振替'] === '1' || row['振替'] === 'true') {
            return null;
        }

        // 計算対象外も除外
        if (row['計算対象'] === '0' || row['計算対象'] === 'false') {
            return null;
        }

        const date = parseDate(getColumnValue(row, columnMapping.date));
        const amount = parseAmount(getColumnValue(row, columnMapping.amount));
        const merchant = getColumnValue(row, columnMapping.merchant);
        const description = columnMapping.description
            ? getColumnValue(row, columnMapping.description)
            : undefined;
        const originalCategory = columnMapping.category
            ? getColumnValue(row, columnMapping.category)
            : undefined;

        // 必須項目チェック
        if (!date || amount === 0 || !merchant) {
            return null;
        }

        // MF は支出がマイナスで表示されることがあるので絶対値を取る
        return {
            date,
            amount: Math.abs(amount),
            merchant,
            description,
            originalCategory,
            rawData: row,
        };
    },
};

export default moneyforwardMapper;
