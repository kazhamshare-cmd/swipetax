// トランザクション（取引データ）サービス - Firestoreでデバイス間同期
import {
    collection,
    doc,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    Timestamp,
    writeBatch,
    deleteDoc,
    updateDoc,
    getCountFromServer,
} from 'firebase/firestore';
import { db } from './firebase';
import { Transaction, ExpenseCategory, TransactionStatus, DataSource } from './types';

// ============================================
// コレクション名定義（移行時はここを変更）
// ============================================
const COLLECTION_TRANSACTIONS = 'swipetax_transactions';
const COLLECTION_TAX_RETURNS = 'swipetax_tax_returns';
const COLLECTION_USERS = 'swipetax_users';

// Firestore用の取引データ型
interface FirestoreTransaction {
    userId: string;
    fiscalYear: number;
    date: string;
    amount: number;
    merchant: string;
    description?: string;
    status: TransactionStatus;
    category?: ExpenseCategory;
    userNote?: string;
    aiCategory?: ExpenseCategory;
    aiConfidence?: number;
    aiReasoning?: string;
    source: DataSource;
    sourceFile?: string;
    receiptImage?: string;
    bankName?: string;
    accountNumber?: string;
    balance?: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * 取引を保存（単一）
 */
export async function saveTransaction(
    userId: string,
    transaction: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_TRANSACTIONS), {
        ...transaction,
        userId,
        createdAt: now,
        updatedAt: now,
    } as FirestoreTransaction);
    return docRef.id;
}

/**
 * 複数の取引を一括保存（バッチ処理 - 500件ごとに分割）
 */
export async function saveTransactions(
    userId: string,
    transactions: Array<Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
    onProgress?: (saved: number, total: number) => void
): Promise<string[]> {
    const BATCH_SIZE = 500; // Firestoreのバッチ上限
    const ids: string[] = [];
    const now = Timestamp.now();

    // 500件ごとにバッチを分割
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = transactions.slice(i, i + BATCH_SIZE);

        for (const tx of chunk) {
            const docRef = doc(collection(db, COLLECTION_TRANSACTIONS));
            ids.push(docRef.id);
            batch.set(docRef, {
                ...tx,
                userId,
                createdAt: now,
                updatedAt: now,
            } as FirestoreTransaction);
        }

        await batch.commit();

        // 進捗通知
        if (onProgress) {
            onProgress(Math.min(i + BATCH_SIZE, transactions.length), transactions.length);
        }
    }

    return ids;
}

/**
 * ユーザーの取引一覧を取得
 */
export async function getTransactions(
    userId: string,
    fiscalYear?: number
): Promise<Transaction[]> {
    let q = query(
        collection(db, COLLECTION_TRANSACTIONS),
        where('userId', '==', userId),
        orderBy('date', 'desc')
    );

    if (fiscalYear) {
        q = query(
            collection(db, COLLECTION_TRANSACTIONS),
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
    })) as Transaction[];
}

/**
 * 未分類の取引を取得（スワイプ用 - ページネーション対応）
 */
export async function getPendingTransactions(
    userId: string,
    pageSize: number = 50,
    lastDoc?: Transaction
): Promise<{ transactions: Transaction[]; hasMore: boolean }> {
    let q;

    if (lastDoc) {
        q = query(
            collection(db, COLLECTION_TRANSACTIONS),
            where('userId', '==', userId),
            where('status', '==', 'pending'),
            orderBy('date', 'desc'),
            startAfter(lastDoc.date),
            limit(pageSize + 1)
        );
    } else {
        q = query(
            collection(db, COLLECTION_TRANSACTIONS),
            where('userId', '==', userId),
            where('status', '==', 'pending'),
            orderBy('date', 'desc'),
            limit(pageSize + 1)
        );
    }

    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
    })) as Transaction[];

    const hasMore = docs.length > pageSize;
    const transactions = hasMore ? docs.slice(0, pageSize) : docs;

    return { transactions, hasMore };
}

/**
 * 未分類取引の件数を取得
 */
export async function getPendingTransactionCount(userId: string): Promise<number> {
    const q = query(
        collection(db, COLLECTION_TRANSACTIONS),
        where('userId', '==', userId),
        where('status', '==', 'pending')
    );

    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
}

/**
 * 取引を更新
 */
export async function updateTransaction(
    transactionId: string,
    updates: Partial<Transaction>
): Promise<void> {
    const docRef = doc(db, COLLECTION_TRANSACTIONS, transactionId);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
    });
}

/**
 * 取引を削除
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_TRANSACTIONS, transactionId));
}

/**
 * 銀行明細からの取引を保存
 */
export async function saveBankStatementTransactions(
    userId: string,
    transactions: Array<{
        date: string;
        description: string;
        amount: number;
        balance?: number;
        isDeposit: boolean;
    }>,
    bankName: string | null,
    accountNumber?: string | null,
    imageUrl?: string
): Promise<string[]> {
    const fiscalYear = new Date().getFullYear();

    const txData = transactions.map(tx => ({
        fiscalYear,
        date: tx.date,
        amount: tx.isDeposit ? -tx.amount : tx.amount, // 入金は負（収入）、出金は正（支出）
        merchant: tx.description,
        description: tx.description,
        status: 'pending' as TransactionStatus,
        source: 'ocr' as DataSource,
        sourceFile: imageUrl,
        bankName: bankName || undefined,
        accountNumber: accountNumber || undefined,
        balance: tx.balance,
    }));

    return saveTransactions(userId, txData);
}

/**
 * ステータス別の取引を取得
 */
export async function getTransactionsByStatus(
    userId: string,
    status: TransactionStatus,
    fiscalYear?: number
): Promise<Transaction[]> {
    let q;
    if (fiscalYear) {
        q = query(
            collection(db, COLLECTION_TRANSACTIONS),
            where('userId', '==', userId),
            where('status', '==', status),
            where('fiscalYear', '==', fiscalYear),
            orderBy('date', 'desc')
        );
    } else {
        q = query(
            collection(db, COLLECTION_TRANSACTIONS),
            where('userId', '==', userId),
            where('status', '==', status),
            orderBy('date', 'desc')
        );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
    })) as Transaction[];
}

/**
 * 保留中の取引を取得（後から入力用）
 */
export async function getHeldTransactions(userId: string, fiscalYear?: number): Promise<Transaction[]> {
    return getTransactionsByStatus(userId, 'held', fiscalYear);
}

/**
 * レシートからの取引を保存
 */
export async function saveReceiptTransaction(
    userId: string,
    data: {
        merchant: string | null;
        date: string | null;
        totalAmount: number | null;
        suggestedCategory: ExpenseCategory | null;
    },
    imageUrl?: string
): Promise<string> {
    const fiscalYear = new Date().getFullYear();

    return saveTransaction(userId, {
        fiscalYear,
        date: data.date || new Date().toISOString().split('T')[0],
        amount: data.totalAmount || 0,
        merchant: data.merchant || '不明',
        status: 'pending',
        aiCategory: data.suggestedCategory || undefined,
        source: 'ocr',
        receiptImage: imageUrl,
    });
}
