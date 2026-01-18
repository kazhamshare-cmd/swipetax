// ビジネスプロフィール・按分・源泉徴収管理サービス
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { FilingType, IncomeType } from './types';

// 事業形態（年金受給者対応を追加）
export type BusinessType =
    | 'freelance'           // フリーランス
    | 'sole_proprietor'     // 個人事業主
    | 'side_business'       // 副業
    | 'pensioner'           // 年金受給者
    | 'pensioner_with_work'; // 年金＋アルバイト

// 事業形態の表示情報
export const BUSINESS_TYPE_INFO: Record<BusinessType, { nameJa: string; description: string }> = {
    freelance: {
        nameJa: 'フリーランス',
        description: 'デザイナー、エンジニア、ライターなど',
    },
    sole_proprietor: {
        nameJa: '個人事業主',
        description: '開業届を出して事業を営んでいる',
    },
    side_business: {
        nameJa: '副業',
        description: '会社員をしながら副収入がある',
    },
    pensioner: {
        nameJa: '年金受給者',
        description: '年金のみを受給している',
    },
    pensioner_with_work: {
        nameJa: '年金＋アルバイト',
        description: '年金を受給しながらパート等で働いている',
    },
};

// 源泉徴収エントリー（会社別）
export interface WithholdingTaxEntry {
    id: string;
    companyName: string;
    amount: number;
}

// 保険料控除エントリー（保険会社別）
export interface InsuranceEntry {
    id: string;
    companyName: string;
    type: 'life' | 'medical' | 'pension';  // 一般生命保険/介護医療保険/個人年金保険
    amount: number;
}

// ビジネスプロフィールの型
export interface BusinessProfile {
    // 基本情報
    businessType: BusinessType;
    filingType: FilingType;
    businessName?: string;
    fiscalYear: number;

    // 年金受給者対応（Phase C）
    birthDate?: string;                    // 生年月日（65歳判定用）YYYY-MM-DD
    primaryIncomeTypes?: IncomeType[];     // 主な収入種別

    // 按分設定（0-100%）
    homeOfficeRatio: {
        rent: number;           // 家賃の事業使用割合
        utilities: number;      // 水道光熱費の事業使用割合
        internet: number;       // 通信費の事業使用割合
    };

    // 源泉徴収税額（複数エントリー対応）
    withholdingTax: number;  // 後方互換性のため残す（合計値）
    withholdingTaxEntries?: WithholdingTaxEntry[];

    // 保険料控除（複数エントリー対応）
    insuranceEntries?: InsuranceEntry[];

    // オンボーディング完了フラグ
    onboardingCompleted: boolean;

    // メタデータ
    createdAt?: Date;
    updatedAt?: Date;
}

// デフォルト値
export const DEFAULT_BUSINESS_PROFILE: Omit<BusinessProfile, 'fiscalYear'> = {
    businessType: 'freelance',
    filingType: 'blue_etax',
    homeOfficeRatio: {
        rent: 0,
        utilities: 0,
        internet: 0,
    },
    withholdingTax: 0,
    withholdingTaxEntries: [],
    insuranceEntries: [],
    onboardingCompleted: false,
};

// 保険タイプの表示情報
export const INSURANCE_TYPE_INFO: Record<InsuranceEntry['type'], { nameJa: string }> = {
    life: { nameJa: '一般生命保険' },
    medical: { nameJa: '介護医療保険' },
    pension: { nameJa: '個人年金保険' },
};

// 源泉徴収の合計を計算
export function calculateTotalWithholdingTax(entries: WithholdingTaxEntry[]): number {
    return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

// 保険料控除の合計を計算（タイプ別）
export function calculateInsuranceDeduction(entries: InsuranceEntry[]): {
    life: number;
    medical: number;
    pension: number;
    total: number;
} {
    const life = entries.filter(e => e.type === 'life').reduce((sum, e) => sum + e.amount, 0);
    const medical = entries.filter(e => e.type === 'medical').reduce((sum, e) => sum + e.amount, 0);
    const pension = entries.filter(e => e.type === 'pension').reduce((sum, e) => sum + e.amount, 0);

    // 各区分の控除上限は4万円、合計上限は12万円
    const lifeDeduction = Math.min(life, 40000);
    const medicalDeduction = Math.min(medical, 40000);
    const pensionDeduction = Math.min(pension, 40000);

    return {
        life: lifeDeduction,
        medical: medicalDeduction,
        pension: pensionDeduction,
        total: Math.min(lifeDeduction + medicalDeduction + pensionDeduction, 120000),
    };
}

// ユニークIDを生成
export function generateEntryId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ビジネスプロフィールを取得
 */
export async function getBusinessProfile(userId: string, fiscalYear: number): Promise<BusinessProfile | null> {
    try {
        const docRef = doc(db, 'users', userId, 'business_profile', String(fiscalYear));
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const withholdingTaxEntries = data.withholdingTaxEntries || [];
            const insuranceEntries = data.insuranceEntries || [];

            // 後方互換性: entriesがあればそこから合計を計算、なければ旧withholdingTax値を使用
            const withholdingTax = withholdingTaxEntries.length > 0
                ? calculateTotalWithholdingTax(withholdingTaxEntries)
                : (data.withholdingTax || 0);

            return {
                businessType: data.businessType || 'freelance',
                filingType: data.filingType || 'blue_etax',
                businessName: data.businessName,
                fiscalYear: data.fiscalYear || fiscalYear,
                // 年金受給者対応（Phase C）
                birthDate: data.birthDate,
                primaryIncomeTypes: data.primaryIncomeTypes || [],
                homeOfficeRatio: {
                    rent: data.homeOfficeRatio?.rent || 0,
                    utilities: data.homeOfficeRatio?.utilities || 0,
                    internet: data.homeOfficeRatio?.internet || 0,
                },
                withholdingTax,
                withholdingTaxEntries,
                insuranceEntries,
                onboardingCompleted: data.onboardingCompleted || false,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            };
        }

        return null;
    } catch (error) {
        console.error('Error getting business profile:', error);
        throw error;
    }
}

/**
 * ビジネスプロフィールを保存
 */
export async function saveBusinessProfile(
    userId: string,
    profile: Partial<BusinessProfile> & { fiscalYear: number }
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'business_profile', String(profile.fiscalYear));

        const existingDoc = await getDoc(docRef);
        const isNew = !existingDoc.exists();

        await setDoc(docRef, {
            ...profile,
            ...(isNew ? { createdAt: serverTimestamp() } : {}),
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('Error saving business profile:', error);
        throw error;
    }
}

/**
 * オンボーディング完了を記録
 */
export async function markOnboardingComplete(userId: string, fiscalYear: number): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'business_profile', String(fiscalYear));
        await setDoc(docRef, {
            fiscalYear,
            onboardingCompleted: true,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('Error marking onboarding complete:', error);
        throw error;
    }
}

/**
 * 按分後の金額を計算
 */
export function calculateProportionalAmount(
    totalAmount: number,
    ratioPercent: number
): number {
    return Math.floor(totalAmount * (ratioPercent / 100));
}

/**
 * 源泉徴収後の還付/納付額を計算
 */
export function calculateFinalTax(
    totalTax: number,
    withholdingTax: number
): { finalAmount: number; isRefund: boolean } {
    const finalAmount = totalTax - withholdingTax;
    return {
        finalAmount: Math.abs(finalAmount),
        isRefund: finalAmount < 0,
    };
}

/**
 * 生年月日から指定日時点での年齢を計算
 */
export function calculateAge(birthDate: string, atDate?: Date): number {
    const birth = new Date(birthDate);
    const target = atDate || new Date();

    let age = target.getFullYear() - birth.getFullYear();
    const monthDiff = target.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && target.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

/**
 * 指定日時点で65歳以上かどうかを判定
 */
export function isAge65OrOlder(birthDate?: string, atDate?: Date): boolean {
    if (!birthDate) return false;
    return calculateAge(birthDate, atDate) >= 65;
}
