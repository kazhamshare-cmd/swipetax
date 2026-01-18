// 給与・人件費サービス - Firestoreでデバイス間同期
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
import { PayrollEntry, EmployeeType, Transaction, TransactionStatus, DataSource, ExpenseCategory } from './types';

// ============================================
// コレクション名定義
// ============================================
const COLLECTION_PAYROLL = 'swipetax_payroll';
const COLLECTION_TRANSACTIONS = 'swipetax_transactions';

// Firestore用の給与データ型
interface FirestorePayrollEntry {
    userId: string;
    fiscalYear: number;
    employeeName: string;
    employeeType: EmployeeType;
    position?: string;
    paymentDate: string;
    paymentMonth: string;
    workHours?: number;
    hourlyRate?: number;
    baseSalary?: number;
    grossAmount: number;
    deductions?: {
        incomeTax?: number;
        healthInsurance?: number;
        pensionInsurance?: number;
        employmentInsurance?: number;
        other?: number;
    };
    netAmount: number;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * 給与データを保存
 */
export async function savePayrollEntry(
    userId: string,
    entry: Omit<PayrollEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_PAYROLL), {
        ...entry,
        userId,
        createdAt: now,
        updatedAt: now,
    } as FirestorePayrollEntry);

    // 取引データとして経費を自動登録（外注費として）
    await addDoc(collection(db, COLLECTION_TRANSACTIONS), {
        userId,
        fiscalYear: entry.fiscalYear,
        date: entry.paymentDate,
        amount: entry.grossAmount, // 総支給額を経費として記録
        merchant: `給与 - ${entry.employeeName}`,
        description: `${entry.paymentMonth} ${entry.employeeType === 'part_time' ? 'アルバイト' : '社員'}給与`,
        status: 'approved' as TransactionStatus,
        category: 'outsourcing' as ExpenseCategory, // 外注費として記録
        source: 'manual' as DataSource,
        createdAt: now,
        updatedAt: now,
    });

    return docRef.id;
}

/**
 * 給与一覧を取得
 */
export async function getPayrollEntries(
    userId: string,
    fiscalYear?: number
): Promise<PayrollEntry[]> {
    let q = query(
        collection(db, COLLECTION_PAYROLL),
        where('userId', '==', userId),
        orderBy('paymentDate', 'desc')
    );

    if (fiscalYear) {
        q = query(
            collection(db, COLLECTION_PAYROLL),
            where('userId', '==', userId),
            where('fiscalYear', '==', fiscalYear),
            orderBy('paymentDate', 'desc')
        );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
    })) as PayrollEntry[];
}

/**
 * 月別の給与合計を取得
 */
export async function getMonthlyPayrollTotal(
    userId: string,
    yearMonth: string // YYYY-MM
): Promise<{ total: number; count: number }> {
    const q = query(
        collection(db, COLLECTION_PAYROLL),
        where('userId', '==', userId),
        where('paymentMonth', '==', yearMonth)
    );

    const snapshot = await getDocs(q);
    let total = 0;
    let count = 0;

    snapshot.docs.forEach(doc => {
        total += doc.data().grossAmount || 0;
        count++;
    });

    return { total, count };
}

/**
 * 給与データを更新
 */
export async function updatePayrollEntry(
    entryId: string,
    updates: Partial<PayrollEntry>
): Promise<void> {
    const docRef = doc(db, COLLECTION_PAYROLL, entryId);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
    });
}

/**
 * 給与データを削除
 */
export async function deletePayrollEntry(entryId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_PAYROLL, entryId));
}

/**
 * 従業員別の給与合計を取得
 */
export async function getEmployeePayrollSummary(
    userId: string,
    fiscalYear: number
): Promise<Array<{ employeeName: string; totalAmount: number; paymentCount: number }>> {
    const q = query(
        collection(db, COLLECTION_PAYROLL),
        where('userId', '==', userId),
        where('fiscalYear', '==', fiscalYear)
    );

    const snapshot = await getDocs(q);
    const summary: Record<string, { totalAmount: number; paymentCount: number }> = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const name = data.employeeName;
        if (!summary[name]) {
            summary[name] = { totalAmount: 0, paymentCount: 0 };
        }
        summary[name].totalAmount += data.grossAmount || 0;
        summary[name].paymentCount++;
    });

    return Object.entries(summary).map(([employeeName, data]) => ({
        employeeName,
        ...data,
    }));
}

/**
 * アルバイトの給与自動計算
 */
export function calculatePartTimePayroll(
    workHours: number,
    hourlyRate: number
): { grossAmount: number; netAmount: number } {
    const grossAmount = workHours * hourlyRate;
    // 簡易計算：源泉徴収なしとして手取り = 総支給額
    // ※88,000円以上の場合は源泉徴収が必要だが、ここでは簡略化
    return {
        grossAmount,
        netAmount: grossAmount,
    };
}

/**
 * 社員の給与計算（控除後）
 */
export function calculateFullTimePayroll(
    baseSalary: number,
    deductions: {
        incomeTax?: number;
        healthInsurance?: number;
        pensionInsurance?: number;
        employmentInsurance?: number;
        other?: number;
    }
): { grossAmount: number; netAmount: number; totalDeductions: number } {
    const totalDeductions =
        (deductions.incomeTax || 0) +
        (deductions.healthInsurance || 0) +
        (deductions.pensionInsurance || 0) +
        (deductions.employmentInsurance || 0) +
        (deductions.other || 0);

    return {
        grossAmount: baseSalary,
        netAmount: baseSalary - totalDeductions,
        totalDeductions,
    };
}
