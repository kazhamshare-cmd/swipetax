// 弥生会計 CSV マッパー

import { CSVMapper, CSVMapperConfig, MappedTransaction } from './types';

/**
 * 弥生会計の仕訳日記帳エクスポート CSV 形式
 *
 * 想定カラム:
 * 伝票No,取引日付,借方勘定科目,借方補助科目,借方金額,貸方勘定科目,貸方補助科目,貸方金額,摘要
 *
 * または簡易形式:
 * 日付,勘定科目,金額,摘要
 */
export const yayoiMapperConfig: CSVMapperConfig = {
    serviceId: 'yayoi',
    serviceName: 'Yayoi',
    serviceNameJa: '弥生会計',
    expectedHeaders: ['取引日付', '借方勘定科目', '借方金額', '摘要'],
    columnMapping: {
        date: ['取引日付', '日付', '伝票日付'],
        amount: ['借方金額', '金額'],
        merchant: ['摘要', '取引先'],
        description: ['摘要'],
        category: ['借方勘定科目', '勘定科目'],
    },
    dateFormat: 'YYYY/MM/DD',
    encoding: 'Shift_JIS', // 弥生は Shift_JIS が多い
};

function parseDate(dateStr: string): string {
    if (!dateStr) return '';

    const cleaned = dateStr.trim().replace(/\//g, '-');

    // YYYY-MM-DD 形式
    const match1 = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match1) {
        const [, year, month, day] = match1;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // 和暦対応（R6/01/15 → 2024-01-15）
    const warekiMatch = cleaned.match(/^([RMTSH])(\d{1,2})[/-](\d{1,2})[/-](\d{1,2})$/i);
    if (warekiMatch) {
        const [, era, yearNum, month, day] = warekiMatch;
        const baseYear: Record<string, number> = { 'R': 2018, 'H': 1988, 'S': 1925, 'T': 1911, 'M': 1867 };
        const year = (baseYear[era.toUpperCase()] || 2018) + parseInt(yearNum, 10);
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

function extractMerchantFromDescription(description: string): string {
    // 摘要から取引先を抽出（よくあるパターン）
    // 例: "Amazon.co.jp ビジネス書籍" → "Amazon.co.jp"
    // 例: "○○株式会社 請求書No.123" → "○○株式会社"

    if (!description) return '';

    // 株式会社、有限会社などで区切る
    const companyMatch = description.match(/^(.+?(株式会社|有限会社|合同会社|㈱|㈲))/);
    if (companyMatch) {
        return companyMatch[1].trim();
    }

    // 最初のスペースまでを取引先とする
    const spaceIndex = description.indexOf(' ');
    if (spaceIndex > 0) {
        return description.substring(0, spaceIndex).trim();
    }

    // スペースがなければ全体を取引先とする
    return description.trim();
}

export const yayoiMapper: CSVMapper = {
    config: yayoiMapperConfig,

    detect(headers: string[]): boolean {
        const headerSet = new Set(headers.map(h => h.trim()));

        // 弥生特有のカラム名をチェック
        const yayoiSpecific = ['借方勘定科目', '借方金額', '貸方勘定科目', '貸方金額', '伝票No'];
        const matchCount = yayoiSpecific.filter(h => headerSet.has(h)).length;

        // 少なくとも2つの弥生特有カラムがあれば弥生と判定
        return matchCount >= 2;
    },

    map(row: Record<string, string>): MappedTransaction | null {
        const { columnMapping } = yayoiMapperConfig;

        const date = parseDate(getColumnValue(row, columnMapping.date));
        const amount = parseAmount(getColumnValue(row, columnMapping.amount));
        const description = columnMapping.description
            ? getColumnValue(row, columnMapping.description)
            : undefined;
        const originalCategory = columnMapping.category
            ? getColumnValue(row, columnMapping.category)
            : undefined;

        // 弥生は摘要から取引先を抽出することが多い
        let merchant = getColumnValue(row, columnMapping.merchant);
        if (merchant === description && description) {
            merchant = extractMerchantFromDescription(description);
        }

        // 必須項目チェック
        if (!date || amount === 0) {
            return null;
        }

        // 取引先が空の場合は摘要から抽出
        if (!merchant && description) {
            merchant = extractMerchantFromDescription(description);
        }

        // それでも取引先が空なら「不明」とする
        if (!merchant) {
            merchant = '不明';
        }

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

export default yayoiMapper;
