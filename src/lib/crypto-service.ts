// 仮想通貨（暗号資産）サービス
import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
    CryptoEntry,
    CryptoTransactionType,
    CryptoCurrency,
    CryptoGainResult,
} from './types';

const COLLECTION_NAME = 'swipetax_crypto';

// ============================================
// 損益計算（総平均法）
// ============================================

/**
 * 仮想通貨の損益を計算（総平均法）
 *
 * 総平均法：年間の購入総額 ÷ 購入総数量 = 平均取得単価
 * 売却益 = 売却金額 - (平均取得単価 × 売却数量)
 */
export function calculateCryptoGains(entries: CryptoEntry[]): CryptoGainResult[] {
    // 通貨ごとにグループ化
    const byCurrency = new Map<string, CryptoEntry[]>();

    for (const entry of entries) {
        const key = entry.currency === 'OTHER'
            ? `OTHER:${entry.customCurrencyName || 'unknown'}`
            : entry.currency;

        if (!byCurrency.has(key)) {
            byCurrency.set(key, []);
        }
        byCurrency.get(key)!.push(entry);
    }

    const results: CryptoGainResult[] = [];

    for (const [key, currencyEntries] of byCurrency) {
        const isOther = key.startsWith('OTHER:');
        const currency = isOther ? 'OTHER' as CryptoCurrency : key as CryptoCurrency;
        const customCurrencyName = isOther ? key.replace('OTHER:', '') : undefined;

        // 購入と売却を分類
        const buyEntries = currencyEntries.filter(e =>
            e.transactionType === 'buy' || e.transactionType === 'receive'
        );
        const sellEntries = currencyEntries.filter(e =>
            e.transactionType === 'sell' || e.transactionType === 'exchange'
        );

        // 購入総額と購入総数量
        const totalBought = buyEntries.reduce((sum, e) => sum + e.totalAmount + (e.fee || 0), 0);
        const totalQuantityBought = buyEntries.reduce((sum, e) => sum + e.quantity, 0);

        // 売却総額と売却総数量
        const totalSold = sellEntries.reduce((sum, e) => sum + e.totalAmount - (e.fee || 0), 0);
        const totalQuantitySold = sellEntries.reduce((sum, e) => sum + e.quantity, 0);

        // 平均取得単価（総平均法）
        const averageCost = totalQuantityBought > 0
            ? totalBought / totalQuantityBought
            : 0;

        // 実現損益 = 売却金額 - (平均取得単価 × 売却数量)
        const realizedGain = totalSold - (averageCost * totalQuantitySold);

        // 未売却数量
        const unrealizedQuantity = Math.max(0, totalQuantityBought - totalQuantitySold);

        results.push({
            currency,
            customCurrencyName,
            totalBought,
            totalSold,
            totalQuantityBought,
            totalQuantitySold,
            averageCost: Math.round(averageCost),
            realizedGain: Math.round(realizedGain),
            unrealizedQuantity,
        });
    }

    return results;
}

/**
 * 仮想通貨の総合損益を計算
 */
export function calculateTotalCryptoGain(entries: CryptoEntry[]): {
    totalGain: number;
    totalBought: number;
    totalSold: number;
    gainsByCurrency: CryptoGainResult[];
} {
    const gainsByCurrency = calculateCryptoGains(entries);

    const totalGain = gainsByCurrency.reduce((sum, g) => sum + g.realizedGain, 0);
    const totalBought = gainsByCurrency.reduce((sum, g) => sum + g.totalBought, 0);
    const totalSold = gainsByCurrency.reduce((sum, g) => sum + g.totalSold, 0);

    return {
        totalGain,
        totalBought,
        totalSold,
        gainsByCurrency,
    };
}

// ============================================
// 確定申告要否判定（給与所得者向け）
// ============================================

export interface CryptoFilingResult {
    required: boolean;
    reason: string;
    gain: number;
    threshold: number;
}

/**
 * 給与所得者の仮想通貨確定申告要否を判定
 *
 * 給与所得者で給与以外の所得が20万円以下なら確定申告不要
 * ただし、住民税の申告は必要
 */
export function needsCryptoFiling(
    cryptoGain: number,
    otherMiscIncome: number = 0
): CryptoFilingResult {
    const threshold = 200000; // 20万円
    const totalMiscIncome = cryptoGain + otherMiscIncome;

    if (totalMiscIncome <= threshold) {
        return {
            required: false,
            reason: `給与以外の所得が${threshold.toLocaleString()}円以下のため、確定申告は不要です。ただし、住民税の申告は必要な場合があります。`,
            gain: cryptoGain,
            threshold,
        };
    }

    return {
        required: true,
        reason: `給与以外の所得が${threshold.toLocaleString()}円を超えているため、確定申告が必要です。`,
        gain: cryptoGain,
        threshold,
    };
}

// ============================================
// Firestore操作
// ============================================

/**
 * 仮想通貨取引を保存
 */
export async function saveCryptoEntry(
    userId: string,
    entry: Omit<CryptoEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    try {
        const id = entry.fiscalYear + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const docRef = doc(db, COLLECTION_NAME, id);

        const now = Date.now();
        const data: CryptoEntry = {
            ...entry,
            id,
            userId,
            createdAt: now,
            updatedAt: now,
        };

        await setDoc(docRef, {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return id;
    } catch (error) {
        console.error('Error saving crypto entry:', error);
        throw error;
    }
}

/**
 * 仮想通貨取引一覧を取得
 */
export async function getCryptoEntries(
    userId: string,
    fiscalYear: number
): Promise<CryptoEntry[]> {
    try {
        const collectionRef = collection(db, COLLECTION_NAME);
        const q = query(
            collectionRef,
            where('userId', '==', userId),
            where('fiscalYear', '==', fiscalYear),
            orderBy('date', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId,
                fiscalYear: data.fiscalYear,
                transactionType: data.transactionType,
                date: data.date,
                exchange: data.exchange,
                currency: data.currency,
                customCurrencyName: data.customCurrencyName,
                quantity: data.quantity,
                pricePerUnit: data.pricePerUnit,
                totalAmount: data.totalAmount,
                fee: data.fee,
                notes: data.notes,
                createdAt: data.createdAt?.toDate?.()?.getTime() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.getTime() || data.updatedAt,
            } as CryptoEntry;
        });
    } catch (error) {
        console.error('Error getting crypto entries:', error);
        throw error;
    }
}

/**
 * 仮想通貨取引を削除
 */
export async function deleteCryptoEntry(id: string): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting crypto entry:', error);
        throw error;
    }
}

/**
 * 仮想通貨取引を更新
 */
export async function updateCryptoEntry(
    id: string,
    updates: Partial<Omit<CryptoEntry, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await setDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('Error updating crypto entry:', error);
        throw error;
    }
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * 取引所の一覧（日本の主要取引所）
 */
export const CRYPTO_EXCHANGES = [
    { id: 'bitflyer', name: 'bitFlyer' },
    { id: 'coincheck', name: 'Coincheck' },
    { id: 'gmocoin', name: 'GMOコイン' },
    { id: 'bitbank', name: 'bitbank' },
    { id: 'zaif', name: 'Zaif' },
    { id: 'dmm', name: 'DMM Bitcoin' },
    { id: 'sbivc', name: 'SBI VCトレード' },
    { id: 'rakuten', name: '楽天ウォレット' },
    { id: 'binance', name: 'Binance' },
    { id: 'bybit', name: 'Bybit' },
    { id: 'other', name: 'その他' },
];

/**
 * 通貨名を取得
 */
export function getCurrencyDisplayName(
    currency: CryptoCurrency,
    customName?: string
): string {
    if (currency === 'OTHER' && customName) {
        return customName;
    }

    const info = {
        BTC: 'ビットコイン (BTC)',
        ETH: 'イーサリアム (ETH)',
        XRP: 'リップル (XRP)',
        SOL: 'ソラナ (SOL)',
        DOGE: 'ドージコイン (DOGE)',
        OTHER: 'その他',
    };

    return info[currency] || currency;
}
