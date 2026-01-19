// 借入金管理サービス
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// 借入金の種類
export type LoanType =
    | 'bank'           // 銀行融資
    | 'policy'         // 日本政策金融公庫
    | 'credit_union'   // 信用金庫・信用組合
    | 'relatives'      // 親族・知人
    | 'other';         // その他

export const LOAN_TYPE_INFO: Record<LoanType, { nameJa: string }> = {
    bank: { nameJa: '銀行融資' },
    policy: { nameJa: '日本政策金融公庫' },
    credit_union: { nameJa: '信用金庫・信用組合' },
    relatives: { nameJa: '親族・知人' },
    other: { nameJa: 'その他' },
};

// 返済頻度
export type RepaymentFrequency = 'monthly' | 'bimonthly' | 'quarterly' | 'yearly' | 'irregular';

export const REPAYMENT_FREQUENCY_INFO: Record<RepaymentFrequency, { nameJa: string }> = {
    monthly: { nameJa: '毎月' },
    bimonthly: { nameJa: '隔月' },
    quarterly: { nameJa: '四半期' },
    yearly: { nameJa: '年1回' },
    irregular: { nameJa: '不定期' },
};

// 借入金マスタ
export interface Loan {
    id: string;
    userId: string;
    fiscalYear: number;

    // 基本情報
    lenderName: string;              // 貸主名（銀行名など）
    loanType: LoanType;
    purpose?: string;                // 借入目的（運転資金、設備資金など）

    // 金額情報
    originalAmount: number;          // 当初借入額
    currentBalance: number;          // 現在残高（期首時点）
    interestRate?: number;           // 年利（%）

    // 返済情報
    repaymentFrequency: RepaymentFrequency;
    monthlyRepayment?: number;       // 毎月返済額（元利合計）
    repaymentStartDate?: string;     // 返済開始日
    repaymentEndDate?: string;       // 返済終了予定日

    // メモ
    notes?: string;

    // メタデータ
    createdAt?: Date;
    updatedAt?: Date;
}

// 返済記録
export interface LoanRepayment {
    id: string;
    loanId: string;
    userId: string;
    fiscalYear: number;

    // 返済内容
    date: string;                    // 返済日 YYYY-MM-DD
    totalAmount: number;             // 返済総額
    principalAmount: number;         // 元本返済額
    interestAmount: number;          // 利息額

    // 返済後残高
    balanceAfter?: number;

    // メモ
    notes?: string;

    // 入力状態
    isEstimated?: boolean;           // 概算入力かどうか

    // メタデータ
    createdAt?: Date;
    updatedAt?: Date;
}

// コレクション名
const LOANS_COLLECTION = 'swipetax_loans';
const REPAYMENTS_COLLECTION = 'swipetax_loan_repayments';

/**
 * 借入金を保存
 */
export async function saveLoan(loan: Omit<Loan, 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
        const docRef = doc(db, LOANS_COLLECTION, loan.id);
        const existingDoc = await getDoc(docRef);
        const isNew = !existingDoc.exists();

        await setDoc(docRef, {
            ...loan,
            ...(isNew ? { createdAt: serverTimestamp() } : {}),
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('Error saving loan:', error);
        throw error;
    }
}

/**
 * 借入金一覧を取得
 */
export async function getLoans(userId: string, fiscalYear: number): Promise<Loan[]> {
    try {
        const q = query(
            collection(db, LOANS_COLLECTION),
            where('userId', '==', userId),
            where('fiscalYear', '==', fiscalYear),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as Loan;
        });
    } catch (error) {
        console.error('Error getting loans:', error);
        throw error;
    }
}

/**
 * 借入金を削除
 */
export async function deleteLoan(loanId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, LOANS_COLLECTION, loanId));
    } catch (error) {
        console.error('Error deleting loan:', error);
        throw error;
    }
}

/**
 * 返済記録を保存
 */
export async function saveLoanRepayment(
    repayment: Omit<LoanRepayment, 'createdAt' | 'updatedAt'>
): Promise<void> {
    try {
        const docRef = doc(db, REPAYMENTS_COLLECTION, repayment.id);
        const existingDoc = await getDoc(docRef);
        const isNew = !existingDoc.exists();

        await setDoc(docRef, {
            ...repayment,
            ...(isNew ? { createdAt: serverTimestamp() } : {}),
            updatedAt: serverTimestamp(),
        }, { merge: true });

        // 利息を経費として記録する処理は別途実装
    } catch (error) {
        console.error('Error saving loan repayment:', error);
        throw error;
    }
}

/**
 * 返済記録一覧を取得
 */
export async function getLoanRepayments(
    userId: string,
    fiscalYear: number,
    loanId?: string
): Promise<LoanRepayment[]> {
    try {
        let q = query(
            collection(db, REPAYMENTS_COLLECTION),
            where('userId', '==', userId),
            where('fiscalYear', '==', fiscalYear),
            orderBy('date', 'desc')
        );

        if (loanId) {
            q = query(
                collection(db, REPAYMENTS_COLLECTION),
                where('userId', '==', userId),
                where('fiscalYear', '==', fiscalYear),
                where('loanId', '==', loanId),
                orderBy('date', 'desc')
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as LoanRepayment;
        });
    } catch (error) {
        console.error('Error getting loan repayments:', error);
        throw error;
    }
}

/**
 * 返済記録を削除
 */
export async function deleteLoanRepayment(repaymentId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, REPAYMENTS_COLLECTION, repaymentId));
    } catch (error) {
        console.error('Error deleting loan repayment:', error);
        throw error;
    }
}

/**
 * 年間の返済合計を計算
 */
export function calculateYearlyRepaymentSummary(repayments: LoanRepayment[]): {
    totalPrincipal: number;
    totalInterest: number;
    totalAmount: number;
    repaymentCount: number;
} {
    return repayments.reduce(
        (acc, r) => ({
            totalPrincipal: acc.totalPrincipal + r.principalAmount,
            totalInterest: acc.totalInterest + r.interestAmount,
            totalAmount: acc.totalAmount + r.totalAmount,
            repaymentCount: acc.repaymentCount + 1,
        }),
        { totalPrincipal: 0, totalInterest: 0, totalAmount: 0, repaymentCount: 0 }
    );
}

/**
 * 借入金の期末残高を計算
 */
export function calculateEndingBalance(loan: Loan, repayments: LoanRepayment[]): number {
    const totalPrincipalPaid = repayments.reduce((sum, r) => sum + r.principalAmount, 0);
    return loan.currentBalance - totalPrincipalPaid;
}

/**
 * 一括返済記録の生成（過去分まとめて入力用）
 */
export function generateBulkRepayments(
    loan: Loan,
    startMonth: string,  // YYYY-MM
    endMonth: string,    // YYYY-MM
    monthlyPrincipal: number,
    monthlyInterest: number
): Omit<LoanRepayment, 'id' | 'createdAt' | 'updatedAt'>[] {
    const repayments: Omit<LoanRepayment, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');

    let current = new Date(start);
    let runningBalance = loan.currentBalance;

    while (current <= end) {
        const date = current.toISOString().slice(0, 10);
        runningBalance -= monthlyPrincipal;

        repayments.push({
            loanId: loan.id,
            userId: loan.userId,
            fiscalYear: loan.fiscalYear,
            date,
            totalAmount: monthlyPrincipal + monthlyInterest,
            principalAmount: monthlyPrincipal,
            interestAmount: monthlyInterest,
            balanceAfter: Math.max(0, runningBalance),
            isEstimated: true,
        });

        // 次の月へ
        current.setMonth(current.getMonth() + 1);
    }

    return repayments;
}

/**
 * ユニークIDを生成
 */
export function generateLoanId(): string {
    return `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateRepaymentId(): string {
    return `rep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
