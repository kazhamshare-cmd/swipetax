// 収入管理サービス（年金受給者対応 - Phase C）
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { IncomeEntry, IncomeType, PensionType } from './types';
import { isAge65OrOlder } from './business-profile-service';

const COLLECTION_NAME = 'swipetax_income';

// ============================================
// 公的年金等控除の計算
// ============================================

/**
 * 公的年金等控除を計算
 * @param pensionIncome 年金収入（年額）
 * @param isOver65 65歳以上かどうか
 * @param otherIncome 公的年金等以外の所得（給与所得控除後、事業所得等）
 * @returns 控除額
 */
export function calculatePensionDeduction(
    pensionIncome: number,
    isOver65: boolean,
    otherIncome: number = 0
): number {
    if (pensionIncome <= 0) return 0;

    // 公的年金等以外の所得が1,000万円以下の場合
    if (otherIncome <= 10000000) {
        if (isOver65) {
            // 65歳以上
            if (pensionIncome <= 1100000) {
                return pensionIncome; // 全額控除
            } else if (pensionIncome <= 3300000) {
                return 1100000;
            } else if (pensionIncome <= 4100000) {
                return Math.floor(pensionIncome * 0.75 - 275000);
            } else if (pensionIncome <= 7700000) {
                return Math.floor(pensionIncome * 0.85 - 685000);
            } else if (pensionIncome <= 10000000) {
                return Math.floor(pensionIncome * 0.95 - 1455000);
            } else {
                return 1955000;
            }
        } else {
            // 65歳未満
            if (pensionIncome <= 600000) {
                return pensionIncome; // 全額控除
            } else if (pensionIncome <= 1300000) {
                return 600000;
            } else if (pensionIncome <= 4100000) {
                return Math.floor(pensionIncome * 0.75 - 275000);
            } else if (pensionIncome <= 7700000) {
                return Math.floor(pensionIncome * 0.85 - 685000);
            } else if (pensionIncome <= 10000000) {
                return Math.floor(pensionIncome * 0.95 - 1455000);
            } else {
                return 1955000;
            }
        }
    }

    // 公的年金等以外の所得が1,000万円超2,000万円以下の場合（控除額は減額）
    if (otherIncome <= 20000000) {
        if (isOver65) {
            if (pensionIncome <= 1000000) {
                return pensionIncome;
            } else if (pensionIncome <= 3300000) {
                return 1000000;
            } else if (pensionIncome <= 4100000) {
                return Math.floor(pensionIncome * 0.75 - 175000);
            } else if (pensionIncome <= 7700000) {
                return Math.floor(pensionIncome * 0.85 - 585000);
            } else if (pensionIncome <= 10000000) {
                return Math.floor(pensionIncome * 0.95 - 1355000);
            } else {
                return 1855000;
            }
        } else {
            if (pensionIncome <= 500000) {
                return pensionIncome;
            } else if (pensionIncome <= 1300000) {
                return 500000;
            } else if (pensionIncome <= 4100000) {
                return Math.floor(pensionIncome * 0.75 - 175000);
            } else if (pensionIncome <= 7700000) {
                return Math.floor(pensionIncome * 0.85 - 585000);
            } else if (pensionIncome <= 10000000) {
                return Math.floor(pensionIncome * 0.95 - 1355000);
            } else {
                return 1855000;
            }
        }
    }

    // 公的年金等以外の所得が2,000万円超の場合（さらに控除額は減額）
    if (isOver65) {
        if (pensionIncome <= 900000) {
            return pensionIncome;
        } else if (pensionIncome <= 3300000) {
            return 900000;
        } else if (pensionIncome <= 4100000) {
            return Math.floor(pensionIncome * 0.75 - 75000);
        } else if (pensionIncome <= 7700000) {
            return Math.floor(pensionIncome * 0.85 - 485000);
        } else if (pensionIncome <= 10000000) {
            return Math.floor(pensionIncome * 0.95 - 1255000);
        } else {
            return 1755000;
        }
    } else {
        if (pensionIncome <= 400000) {
            return pensionIncome;
        } else if (pensionIncome <= 1300000) {
            return 400000;
        } else if (pensionIncome <= 4100000) {
            return Math.floor(pensionIncome * 0.75 - 75000);
        } else if (pensionIncome <= 7700000) {
            return Math.floor(pensionIncome * 0.85 - 485000);
        } else if (pensionIncome <= 10000000) {
            return Math.floor(pensionIncome * 0.95 - 1255000);
        } else {
            return 1755000;
        }
    }
}

// ============================================
// 給与所得控除の計算
// ============================================

/**
 * 給与所得控除を計算
 * @param salaryIncome 給与収入（年額）
 * @returns 控除額
 */
export function calculateSalaryDeduction(salaryIncome: number): number {
    if (salaryIncome <= 0) return 0;

    if (salaryIncome <= 550000) {
        return salaryIncome; // 全額控除
    } else if (salaryIncome <= 1625000) {
        return 550000;
    } else if (salaryIncome <= 1800000) {
        return Math.floor(salaryIncome * 0.4 - 100000);
    } else if (salaryIncome <= 3600000) {
        return Math.floor(salaryIncome * 0.3 + 80000);
    } else if (salaryIncome <= 6600000) {
        return Math.floor(salaryIncome * 0.2 + 440000);
    } else if (salaryIncome <= 8500000) {
        return Math.floor(salaryIncome * 0.1 + 1100000);
    } else {
        return 1950000; // 上限
    }
}

// ============================================
// 確定申告要否の判定
// ============================================

export interface FilingRequirementResult {
    required: boolean;
    reason: string;
    recommendation?: string;
}

/**
 * 確定申告要否を判定
 * @param pensionIncome 年金収入
 * @param otherIncome 年金以外の所得（給与所得控除後、事業所得等）
 * @param withholdingTax 源泉徴収税額
 * @param isOver65 65歳以上かどうか
 * @returns 確定申告要否と理由
 */
export function needsFilingDeclaration(
    pensionIncome: number,
    otherIncome: number,
    withholdingTax: number = 0,
    isOver65: boolean = true
): FilingRequirementResult {
    // 年金収入が400万円以下かつ他の所得が20万円以下 → 原則不要
    if (pensionIncome <= 4000000 && otherIncome <= 200000) {
        // ただし還付がある場合は申告した方がお得
        const pensionDeduction = calculatePensionDeduction(pensionIncome, isOver65, otherIncome);
        const pensionTaxableIncome = Math.max(0, pensionIncome - pensionDeduction);

        if (withholdingTax > 0 && pensionTaxableIncome === 0) {
            return {
                required: false,
                reason: '年金収入400万円以下かつ他の所得20万円以下のため、確定申告は不要です。',
                recommendation: '源泉徴収された税金が還付される可能性があります。申告することをおすすめします。',
            };
        }

        return {
            required: false,
            reason: '年金収入400万円以下かつ他の所得20万円以下のため、確定申告は不要です。',
        };
    }

    // 年金収入が400万円超
    if (pensionIncome > 4000000) {
        return {
            required: true,
            reason: '年金収入が400万円を超えているため、確定申告が必要です。',
        };
    }

    // 他の所得が20万円超
    if (otherIncome > 200000) {
        return {
            required: true,
            reason: '年金以外の所得が20万円を超えているため、確定申告が必要です。',
        };
    }

    return {
        required: false,
        reason: '確定申告は不要です。',
    };
}

// ============================================
// 所得計算のサマリー
// ============================================

export interface IncomeSummary {
    // 収入
    businessRevenue: number;      // 事業収入
    salaryRevenue: number;        // 給与収入
    pensionRevenue: number;       // 年金収入
    miscellaneousRevenue: number; // その他収入

    // 所得（収入 - 各種控除）
    businessIncome: number;       // 事業所得
    salaryIncome: number;         // 給与所得
    pensionIncome: number;        // 年金所得（雑所得）
    miscellaneousIncome: number;  // その他雑所得

    // 所得控除額
    pensionDeduction: number;     // 公的年金等控除
    salaryDeduction: number;      // 給与所得控除

    // 合計
    totalRevenue: number;         // 総収入
    totalIncome: number;          // 合計所得

    // 源泉徴収税額
    totalWithholdingTax: number;
}

/**
 * 収入エントリーから所得サマリーを計算
 */
export function calculateIncomeSummary(
    entries: IncomeEntry[],
    businessExpenses: number = 0,
    blueDeduction: number = 0,
    isOver65: boolean = true
): IncomeSummary {
    // 収入種別ごとに集計
    const businessRevenue = entries
        .filter(e => e.incomeType === 'business')
        .reduce((sum, e) => sum + e.amount, 0);

    const salaryRevenue = entries
        .filter(e => e.incomeType === 'salary')
        .reduce((sum, e) => sum + e.amount, 0);

    const pensionRevenue = entries
        .filter(e => e.incomeType === 'pension')
        .reduce((sum, e) => sum + e.amount, 0);

    const miscellaneousRevenue = entries
        .filter(e => e.incomeType === 'miscellaneous')
        .reduce((sum, e) => sum + e.amount, 0);

    // 源泉徴収税額合計
    const totalWithholdingTax = entries
        .reduce((sum, e) => sum + (e.withholdingTax || 0), 0);

    // 控除額計算
    const salaryDeduction = calculateSalaryDeduction(salaryRevenue);

    // 給与所得・事業所得を先に計算（年金控除計算に使用）
    const salaryIncome = Math.max(0, salaryRevenue - salaryDeduction);
    const businessIncome = Math.max(0, businessRevenue - businessExpenses - blueDeduction);

    // 年金以外の所得を計算
    const otherIncome = salaryIncome + businessIncome + miscellaneousRevenue;

    // 年金控除額計算
    const pensionDeduction = calculatePensionDeduction(pensionRevenue, isOver65, otherIncome);
    const pensionIncome = Math.max(0, pensionRevenue - pensionDeduction);

    // 合計
    const totalRevenue = businessRevenue + salaryRevenue + pensionRevenue + miscellaneousRevenue;
    const totalIncome = businessIncome + salaryIncome + pensionIncome + miscellaneousRevenue;

    return {
        businessRevenue,
        salaryRevenue,
        pensionRevenue,
        miscellaneousRevenue,
        businessIncome,
        salaryIncome,
        pensionIncome,
        miscellaneousIncome: miscellaneousRevenue,
        pensionDeduction,
        salaryDeduction,
        totalRevenue,
        totalIncome,
        totalWithholdingTax,
    };
}

// ============================================
// Firestore操作
// ============================================

/**
 * 収入エントリーを保存
 */
export async function saveIncomeEntry(
    userId: string,
    entry: Omit<IncomeEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    try {
        const id = entry.fiscalYear + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const docRef = doc(db, COLLECTION_NAME, id);

        const now = Date.now();
        const data: IncomeEntry = {
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
        console.error('Error saving income entry:', error);
        throw error;
    }
}

/**
 * 収入エントリー一覧を取得
 */
export async function getIncomeEntries(
    userId: string,
    fiscalYear: number,
    incomeType?: IncomeType
): Promise<IncomeEntry[]> {
    try {
        const collectionRef = collection(db, COLLECTION_NAME);
        let q = query(
            collectionRef,
            where('userId', '==', userId),
            where('fiscalYear', '==', fiscalYear),
            orderBy('date', 'desc')
        );

        if (incomeType) {
            q = query(
                collectionRef,
                where('userId', '==', userId),
                where('fiscalYear', '==', fiscalYear),
                where('incomeType', '==', incomeType),
                orderBy('date', 'desc')
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId,
                fiscalYear: data.fiscalYear,
                incomeType: data.incomeType,
                date: data.date,
                amount: data.amount,
                sourceName: data.sourceName,
                withholdingTax: data.withholdingTax,
                pensionType: data.pensionType,
                salaryMonth: data.salaryMonth,
                notes: data.notes,
                createdAt: data.createdAt?.toDate?.()?.getTime() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.getTime() || data.updatedAt,
            } as IncomeEntry;
        });
    } catch (error) {
        console.error('Error getting income entries:', error);
        throw error;
    }
}

/**
 * 収入エントリーを更新
 */
export async function updateIncomeEntry(
    id: string,
    updates: Partial<Omit<IncomeEntry, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await setDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('Error updating income entry:', error);
        throw error;
    }
}

/**
 * 収入エントリーを削除
 */
export async function deleteIncomeEntry(id: string): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting income entry:', error);
        throw error;
    }
}

/**
 * 収入種別ごとの合計を取得
 */
export async function getIncomeByType(
    userId: string,
    fiscalYear: number
): Promise<Record<IncomeType, { total: number; withholdingTax: number; count: number }>> {
    const entries = await getIncomeEntries(userId, fiscalYear);

    const result: Record<IncomeType, { total: number; withholdingTax: number; count: number }> = {
        business: { total: 0, withholdingTax: 0, count: 0 },
        salary: { total: 0, withholdingTax: 0, count: 0 },
        pension: { total: 0, withholdingTax: 0, count: 0 },
        miscellaneous: { total: 0, withholdingTax: 0, count: 0 },
    };

    for (const entry of entries) {
        result[entry.incomeType].total += entry.amount;
        result[entry.incomeType].withholdingTax += entry.withholdingTax || 0;
        result[entry.incomeType].count += 1;
    }

    return result;
}
