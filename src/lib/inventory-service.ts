// 棚卸資産管理サービス
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// 棚卸資産の状態
export type InventoryStatus = 'pending' | 'completed' | 'estimated';

// 棚卸記録（期末棚卸）
export interface InventoryRecord {
    id: string;
    userId: string;
    fiscalYear: number;

    // 期首棚卸高（前年の期末から引き継ぎ）
    openingInventory: number;

    // 期末棚卸高（実地棚卸で確定）
    closingInventory?: number;

    // 棚卸状態
    status: InventoryStatus;

    // 棚卸実施日
    inventoryDate?: string;          // YYYY-MM-DD

    // 内訳（任意）
    breakdown?: InventoryBreakdown[];

    // メモ
    notes?: string;

    // メタデータ
    createdAt?: Date;
    updatedAt?: Date;
}

// 棚卸内訳（商品カテゴリ別など）
export interface InventoryBreakdown {
    category: string;                // カテゴリ名
    quantity?: number;               // 数量
    unitPrice?: number;              // 単価
    amount: number;                  // 金額
    notes?: string;
}

// 業種別の棚卸カテゴリ例
export const INVENTORY_CATEGORIES: Record<string, string[]> = {
    '酒屋': ['日本酒', 'ワイン', 'ビール', '焼酎', 'ウイスキー', 'その他酒類'],
    'バー': ['スピリッツ', 'リキュール', 'ワイン', 'ビール', 'ソフトドリンク', '消耗品'],
    'アパレル': ['トップス', 'ボトムス', 'アウター', '小物・アクセサリー', 'シューズ'],
    '飲食店': ['食材', '調味料', '飲料', '消耗品'],
    'リサイクルショップ': ['衣類', '家電', '家具', '雑貨', 'ブランド品', 'その他'],
    '小売業': ['商品A', '商品B', '商品C', 'その他'],
};

// コレクション名
const INVENTORY_COLLECTION = 'swipetax_inventory';

/**
 * 棚卸記録を保存
 */
export async function saveInventoryRecord(
    record: Omit<InventoryRecord, 'createdAt' | 'updatedAt'>
): Promise<void> {
    try {
        const docRef = doc(db, INVENTORY_COLLECTION, record.id);
        const existingDoc = await getDoc(docRef);
        const isNew = !existingDoc.exists();

        await setDoc(docRef, {
            ...record,
            ...(isNew ? { createdAt: serverTimestamp() } : {}),
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('Error saving inventory record:', error);
        throw error;
    }
}

/**
 * 棚卸記録を取得
 */
export async function getInventoryRecord(
    userId: string,
    fiscalYear: number
): Promise<InventoryRecord | null> {
    try {
        const q = query(
            collection(db, INVENTORY_COLLECTION),
            where('userId', '==', userId),
            where('fiscalYear', '==', fiscalYear)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        } as InventoryRecord;
    } catch (error) {
        console.error('Error getting inventory record:', error);
        throw error;
    }
}

/**
 * 売上原価を計算
 * 売上原価 = 期首棚卸高 + 仕入高 - 期末棚卸高
 */
export function calculateCostOfGoodsSold(
    openingInventory: number,
    purchases: number,
    closingInventory: number
): number {
    return openingInventory + purchases - closingInventory;
}

/**
 * 売上総利益を計算
 * 売上総利益 = 売上高 - 売上原価
 */
export function calculateGrossProfit(
    revenue: number,
    costOfGoodsSold: number
): number {
    return revenue - costOfGoodsSold;
}

/**
 * 棚卸率を計算（在庫回転率の逆数）
 */
export function calculateInventoryRatio(
    averageInventory: number,
    costOfGoodsSold: number
): number {
    if (costOfGoodsSold === 0) return 0;
    return (averageInventory / costOfGoodsSold) * 100;
}

/**
 * 棚卸記録IDを生成
 */
export function generateInventoryId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 期末棚卸の入力状態をチェック
 */
export function isInventoryComplete(record: InventoryRecord | null): boolean {
    if (!record) return false;
    return record.status === 'completed' && record.closingInventory !== undefined;
}

/**
 * 棚卸未完了の警告メッセージを取得
 */
export function getInventoryWarning(
    record: InventoryRecord | null,
    currentDate: Date
): string | null {
    const month = currentDate.getMonth(); // 0-11

    // 12月以降は棚卸を促す
    if (month >= 11) { // December
        if (!record || record.status === 'pending') {
            return '年末の棚卸を行い、期末在庫を入力してください。';
        }
        if (record.status === 'estimated') {
            return '棚卸が概算入力です。実地棚卸を行って確定してください。';
        }
    }

    // 1-3月（確定申告期間）
    if (month >= 0 && month <= 2) {
        if (!record || !isInventoryComplete(record)) {
            return '確定申告に必要な期末棚卸高が未入力です。';
        }
    }

    return null;
}

/**
 * 簡易棚卸入力（概算）
 * 前年比率から概算値を計算
 */
export function estimateClosingInventory(
    openingInventory: number,
    purchases: number,
    estimatedSalesRatio: number // 売上原価率（例: 0.7 = 70%）
): number {
    // 概算の売上原価
    const estimatedCOGS = purchases * estimatedSalesRatio;
    // 期末棚卸高 = 期首 + 仕入 - 売上原価
    return Math.max(0, openingInventory + purchases - estimatedCOGS);
}
