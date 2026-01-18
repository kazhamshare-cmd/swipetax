// 売上入力サービス - Firestoreでデバイス間同期
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
import { SalesEntry, PaymentMethod, TransactionStatus, DataSource } from './types';

// ============================================
// コレクション名定義
// ============================================
const COLLECTION_SALES = 'swipetax_sales';
const COLLECTION_TRANSACTIONS = 'swipetax_transactions';

// Firestore用の売上データ型
interface FirestoreSalesEntry {
    userId: string;
    fiscalYear: number;
    date: string;
    amount: number;
    paymentMethod: PaymentMethod;
    customerCount?: number;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// 支払い方法の日本語表示
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: '現金',
    credit_card: 'クレジットカード',
    electronic: '電子マネー',
    mixed: '混合',
};

/**
 * 売上データを保存
 */
export async function saveSalesEntry(
    userId: string,
    entry: Omit<SalesEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_SALES), {
        ...entry,
        userId,
        createdAt: now,
        updatedAt: now,
    } as FirestoreSalesEntry);

    // 取引データとして収入を自動登録（負の金額 = 収入）
    await addDoc(collection(db, COLLECTION_TRANSACTIONS), {
        userId,
        fiscalYear: entry.fiscalYear,
        date: entry.date,
        amount: -entry.amount, // 収入なので負の値
        merchant: '売上',
        description: `${entry.date} 売上 (${PAYMENT_METHOD_LABELS[entry.paymentMethod]})${entry.customerCount ? ` ${entry.customerCount}名` : ''}`,
        status: 'approved' as TransactionStatus,
        source: 'manual' as DataSource,
        createdAt: now,
        updatedAt: now,
    });

    return docRef.id;
}

/**
 * 売上一覧を取得
 */
export async function getSalesEntries(
    userId: string,
    fiscalYear?: number
): Promise<SalesEntry[]> {
    let q = query(
        collection(db, COLLECTION_SALES),
        where('userId', '==', userId),
        orderBy('date', 'desc')
    );

    if (fiscalYear) {
        q = query(
            collection(db, COLLECTION_SALES),
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
    })) as SalesEntry[];
}

/**
 * 日別の売上合計を取得
 */
export async function getDailySalesTotal(
    userId: string,
    date: string // YYYY-MM-DD
): Promise<{ total: number; count: number; customerCount: number }> {
    const q = query(
        collection(db, COLLECTION_SALES),
        where('userId', '==', userId),
        where('date', '==', date)
    );

    const snapshot = await getDocs(q);
    let total = 0;
    let count = 0;
    let customerCount = 0;

    snapshot.docs.forEach(doc => {
        total += doc.data().amount || 0;
        count++;
        customerCount += doc.data().customerCount || 0;
    });

    return { total, count, customerCount };
}

/**
 * 月別の売上合計を取得
 */
export async function getMonthlySalesTotal(
    userId: string,
    yearMonth: string // YYYY-MM
): Promise<{ total: number; count: number; customerCount: number; byPaymentMethod: Record<PaymentMethod, number> }> {
    const q = query(
        collection(db, COLLECTION_SALES),
        where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    let total = 0;
    let count = 0;
    let customerCount = 0;
    const byPaymentMethod: Record<PaymentMethod, number> = {
        cash: 0,
        credit_card: 0,
        electronic: 0,
        mixed: 0,
    };

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        // 日付が対象月で始まるかチェック
        if (data.date && data.date.startsWith(yearMonth)) {
            total += data.amount || 0;
            count++;
            customerCount += data.customerCount || 0;
            if (data.paymentMethod) {
                byPaymentMethod[data.paymentMethod as PaymentMethod] += data.amount || 0;
            }
        }
    });

    return { total, count, customerCount, byPaymentMethod };
}

/**
 * 売上データを更新
 */
export async function updateSalesEntry(
    entryId: string,
    updates: Partial<SalesEntry>
): Promise<void> {
    const docRef = doc(db, COLLECTION_SALES, entryId);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
    });
}

/**
 * 売上データを削除
 */
export async function deleteSalesEntry(entryId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_SALES, entryId));
}

/**
 * 日付範囲で売上を取得
 */
export async function getSalesEntriesByDateRange(
    userId: string,
    startDate: string, // YYYY-MM-DD
    endDate: string    // YYYY-MM-DD
): Promise<SalesEntry[]> {
    const q = query(
        collection(db, COLLECTION_SALES),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
    })) as SalesEntry[];
}
