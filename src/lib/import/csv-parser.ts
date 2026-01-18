// CSV パーサー

import Papa from 'papaparse';
import { ALL_MAPPERS, CSVParseResult, MappedTransaction, CSVMapper } from './csv-mappers';

/**
 * CSV ファイルを解析し、取引データに変換する
 */
export async function parseCSV(file: File): Promise<CSVParseResult> {
    return new Promise((resolve) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: (results) => {
                const headers = results.meta.fields || [];

                if (headers.length === 0) {
                    resolve({
                        success: false,
                        totalRows: 0,
                        errors: ['CSVファイルにヘッダーがありません'],
                    });
                    return;
                }

                // 会計サービスを自動判定
                const mapper = detectMapper(headers);

                if (!mapper) {
                    // 自動判定できない場合は手動マッピングを要求
                    resolve({
                        success: false,
                        requiresManualMapping: true,
                        headers,
                        sampleRows: results.data.slice(0, 5) as Record<string, string>[],
                        totalRows: results.data.length,
                        errors: [],
                    });
                    return;
                }

                // 取引データにマッピング
                const transactions: MappedTransaction[] = [];
                const errors: string[] = [];

                results.data.forEach((row, index) => {
                    try {
                        const mapped = mapper.map(row as Record<string, string>);
                        if (mapped) {
                            transactions.push(mapped);
                        }
                    } catch (e) {
                        const error = e instanceof Error ? e.message : '不明なエラー';
                        errors.push(`行 ${index + 2}: ${error}`);
                    }
                });

                resolve({
                    success: true,
                    serviceDetected: mapper.config.serviceId,
                    serviceName: mapper.config.serviceNameJa,
                    transactions,
                    totalRows: results.data.length,
                    importedRows: transactions.length,
                    skippedRows: results.data.length - transactions.length,
                    errors,
                });
            },
            error: (error) => {
                resolve({
                    success: false,
                    totalRows: 0,
                    errors: [`CSVの解析に失敗しました: ${error.message}`],
                });
            },
        });
    });
}

/**
 * ヘッダーから会計サービスを自動判定
 */
function detectMapper(headers: string[]): CSVMapper | null {
    for (const mapper of ALL_MAPPERS) {
        if (mapper.detect(headers)) {
            return mapper;
        }
    }
    return null;
}

/**
 * 手動マッピング設定でCSVを解析
 */
export async function parseCSVWithManualMapping(
    file: File,
    mapping: {
        date: string;
        amount: string;
        merchant: string;
        description?: string;
    }
): Promise<CSVParseResult> {
    return new Promise((resolve) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: (results) => {
                const transactions: MappedTransaction[] = [];
                const errors: string[] = [];

                results.data.forEach((row, index) => {
                    try {
                        const r = row as Record<string, string>;

                        const date = parseDate(r[mapping.date]);
                        const amount = parseAmount(r[mapping.amount]);
                        const merchant = r[mapping.merchant]?.trim() || '';
                        const description = mapping.description
                            ? r[mapping.description]?.trim()
                            : undefined;

                        if (!date || amount === 0 || !merchant) {
                            return; // スキップ
                        }

                        transactions.push({
                            date,
                            amount: Math.abs(amount),
                            merchant,
                            description,
                            rawData: r,
                        });
                    } catch (e) {
                        const error = e instanceof Error ? e.message : '不明なエラー';
                        errors.push(`行 ${index + 2}: ${error}`);
                    }
                });

                resolve({
                    success: true,
                    serviceDetected: 'custom',
                    serviceName: 'カスタム',
                    transactions,
                    totalRows: results.data.length,
                    importedRows: transactions.length,
                    skippedRows: results.data.length - transactions.length,
                    errors,
                });
            },
            error: (error) => {
                resolve({
                    success: false,
                    totalRows: 0,
                    errors: [`CSVの解析に失敗しました: ${error.message}`],
                });
            },
        });
    });
}

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
