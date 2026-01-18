// 仕入れデータサービス - Firestoreでデバイス間同期
import {
    collection,
    doc,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
    deleteDoc,
    updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { PurchaseEntry, PurchaseItem, TransactionStatus, DataSource, ExpenseCategory } from './types';

// ============================================
// コレクション名定義
// ============================================
const COLLECTION_PURCHASES = 'swipetax_purchases';
const COLLECTION_TRANSACTIONS = 'swipetax_transactions';

// Firestore用の仕入れデータ型
interface FirestorePurchaseEntry {
    userId: string;
    fiscalYear: number;
    supplierName: string;
    invoiceNumber?: string;
    date: string;
    items: PurchaseItem[];
    subtotal?: number;
    taxAmount?: number;
    totalAmount: number;
    receiptImage?: string;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// 食材カテゴリの日本語表示
export const ITEM_CATEGORY_LABELS: Record<string, string> = {
    vegetables: '野菜類',
    meat: '肉類',
    seafood: '魚介類',
    seasonings: '調味料',
    other: 'その他',
};

/**
 * 仕入れデータを保存
 */
export async function savePurchaseEntry(
    userId: string,
    entry: Omit<PurchaseEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_PURCHASES), {
        ...entry,
        userId,
        createdAt: now,
        updatedAt: now,
    } as FirestorePurchaseEntry);

    // 取引データとして経費を自動登録（消耗品費として）
    await addDoc(collection(db, COLLECTION_TRANSACTIONS), {
        userId,
        fiscalYear: entry.fiscalYear,
        date: entry.date,
        amount: entry.totalAmount,
        merchant: entry.supplierName,
        description: `仕入れ${entry.invoiceNumber ? ` (伝票No.${entry.invoiceNumber})` : ''}`,
        status: 'approved' as TransactionStatus,
        category: 'supplies' as ExpenseCategory, // 消耗品費として記録
        source: 'ocr' as DataSource,
        receiptImage: entry.receiptImage,
        createdAt: now,
        updatedAt: now,
    });

    return docRef.id;
}

/**
 * 仕入れ一覧を取得
 */
export async function getPurchaseEntries(
    userId: string,
    fiscalYear?: number
): Promise<PurchaseEntry[]> {
    let q = query(
        collection(db, COLLECTION_PURCHASES),
        where('userId', '==', userId),
        orderBy('date', 'desc')
    );

    if (fiscalYear) {
        q = query(
            collection(db, COLLECTION_PURCHASES),
            where('userId', '==', userId),
            where('fiscalYear', '==', fiscalYear),
            orderBy('date', 'desc')
        );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
    })) as PurchaseEntry[];
}

/**
 * 月別の仕入れ合計を取得
 */
export async function getMonthlyPurchaseTotal(
    userId: string,
    yearMonth: string // YYYY-MM
): Promise<{ total: number; count: number; byCategory: Record<string, number> }> {
    const q = query(
        collection(db, COLLECTION_PURCHASES),
        where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    let total = 0;
    let count = 0;
    const byCategory: Record<string, number> = {
        vegetables: 0,
        meat: 0,
        seafood: 0,
        seasonings: 0,
        other: 0,
    };

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        // 日付が対象月で始まるかチェック
        if (data.date && data.date.startsWith(yearMonth)) {
            total += data.totalAmount || 0;
            count++;
            // 品目ごとのカテゴリ集計
            if (data.items && Array.isArray(data.items)) {
                data.items.forEach((item: PurchaseItem) => {
                    const category = item.category || 'other';
                    byCategory[category] = (byCategory[category] || 0) + item.price;
                });
            }
        }
    });

    return { total, count, byCategory };
}

/**
 * 仕入れデータを更新
 */
export async function updatePurchaseEntry(
    entryId: string,
    updates: Partial<PurchaseEntry>
): Promise<void> {
    const docRef = doc(db, COLLECTION_PURCHASES, entryId);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
    });
}

/**
 * 仕入れデータを削除
 */
export async function deletePurchaseEntry(entryId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_PURCHASES, entryId));
}

/**
 * 仕入先別の集計を取得
 */
export async function getSupplierSummary(
    userId: string,
    fiscalYear: number
): Promise<Array<{ supplierName: string; totalAmount: number; purchaseCount: number }>> {
    const q = query(
        collection(db, COLLECTION_PURCHASES),
        where('userId', '==', userId),
        where('fiscalYear', '==', fiscalYear)
    );

    const snapshot = await getDocs(q);
    const summary: Record<string, { totalAmount: number; purchaseCount: number }> = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const name = data.supplierName;
        if (!summary[name]) {
            summary[name] = { totalAmount: 0, purchaseCount: 0 };
        }
        summary[name].totalAmount += data.totalAmount || 0;
        summary[name].purchaseCount++;
    });

    return Object.entries(summary)
        .map(([supplierName, data]) => ({
            supplierName,
            ...data,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);
}
