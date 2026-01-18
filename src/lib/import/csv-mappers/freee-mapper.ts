// freee CSV マッパー

import { CSVMapper, CSVMapperConfig, MappedTransaction, CATEGORY_MAPPING } from './types';

/**
 * freee の取引データエクスポート CSV 形式
 *
 * 想定カラム:
 * 取引日,決済口座,決済日,取引先,勘定科目,税区分,金額,備考
 *
 * または詳細形式:
 * 取引日,取引先,勘定科目,補助科目,税区分,金額,決済口座,決済日,備考
 */
export const freeeMapperConfig: CSVMapperConfig = {
    serviceId: 'freee',
    serviceName: 'freee',
    serviceNameJa: 'freee会計',
    expectedHeaders: ['取引日', '取引先', '勘定科目', '金額'],
    columnMapping: {
        date: ['取引日', '発生日'],
        amount: ['金額', '借方金額'],
        merchant: ['取引先', '取引先名'],
        description: ['備考', '摘要'],
        category: ['勘定科目', '借方勘定科目'],
    },
    dateFormat: 'YYYY/MM/DD',
    encoding: 'UTF-8',
};

function parseDate(dateStr: string): string {
    // YYYY/MM/DD or YYYY-MM-DD を YYYY-MM-DD に正規化
    if (!dateStr) return '';

    const cleaned = dateStr.trim().replace(/\//g, '-');

    // YYYY-MM-DD 形式かチェック
    const match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        const [, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return cleaned;
}

function parseAmount(amountStr: string): number {
    if (!amountStr) return 0;

    // カンマ、円記号、スペースを除去
    const cleaned = amountStr.replace(/[,円¥\s]/g, '');

    // マイナス記号の処理（▲や△も考慮）
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

export const freeeMapper: CSVMapper = {
    config: freeeMapperConfig,

    detect(headers: string[]): boolean {
        const requiredHeaders = freeeMapperConfig.expectedHeaders;
        const headerSet = new Set(headers.map(h => h.trim()));

        // 必須ヘッダーの少なくとも3つが含まれていれば freee と判定
        const matchCount = requiredHeaders.filter(h => headerSet.has(h)).length;
        return matchCount >= 3;
    },

    map(row: Record<string, string>): MappedTransaction | null {
        const { columnMapping } = freeeMapperConfig;

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

        return {
            date,
            amount: Math.abs(amount), // 経費は正の値で統一
            merchant,
            description,
            originalCategory,
            rawData: row,
        };
    },
};

export default freeeMapper;
