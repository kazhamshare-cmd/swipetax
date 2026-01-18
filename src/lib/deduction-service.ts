// 控除データのFirestoreサービス
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { DeductionType, FilingType, BASIC_DEDUCTION } from './types';

// 控除データの型
export interface DeductionData {
    fiscalYear: number;
    filingType: FilingType;
    deductions: {
        socialInsurance: number;    // 社会保険料控除
        lifeInsurance: number;      // 生命保険料控除
        earthquakeInsurance: number; // 地震保険料控除
        spouse: number;             // 配偶者控除
        dependent: number;          // 扶養控除
        basic: number;              // 基礎控除
        medical: number;            // 医療費控除
        donation: number;           // 寄附金控除
    };
    updatedAt?: Date;
}

// デフォルト値
export const DEFAULT_DEDUCTIONS: DeductionData['deductions'] = {
    socialInsurance: 0,
    lifeInsurance: 0,
    earthquakeInsurance: 0,
    spouse: 0,
    dependent: 0,
    basic: BASIC_DEDUCTION,
    medical: 0,
    donation: 0,
};

/**
 * 控除データを取得
 */
export async function getDeductions(userId: string, fiscalYear: number): Promise<DeductionData | null> {
    try {
        const docRef = doc(db, 'users', userId, 'deductions', String(fiscalYear));
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                fiscalYear: data.fiscalYear,
                filingType: data.filingType || 'blue_etax',
                deductions: {
                    socialInsurance: data.deductions?.socialInsurance || 0,
                    lifeInsurance: data.deductions?.lifeInsurance || 0,
                    earthquakeInsurance: data.deductions?.earthquakeInsurance || 0,
                    spouse: data.deductions?.spouse || 0,
                    dependent: data.deductions?.dependent || 0,
                    basic: data.deductions?.basic || BASIC_DEDUCTION,
                    medical: data.deductions?.medical || 0,
                    donation: data.deductions?.donation || 0,
                },
                updatedAt: data.updatedAt?.toDate(),
            };
        }

        return null;
    } catch (error) {
        console.error('Error getting deductions:', error);
        throw error;
    }
}

/**
 * 控除データを保存
 */
export async function saveDeductions(
    userId: string,
    fiscalYear: number,
    filingType: FilingType,
    deductions: DeductionData['deductions']
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'deductions', String(fiscalYear));

        await setDoc(docRef, {
            fiscalYear,
            filingType,
            deductions,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('Error saving deductions:', error);
        throw error;
    }
}

/**
 * 申告種別のみを保存
 */
export async function saveFilingType(
    userId: string,
    fiscalYear: number,
    filingType: FilingType
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'deductions', String(fiscalYear));

        await setDoc(docRef, {
            fiscalYear,
            filingType,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('Error saving filing type:', error);
        throw error;
    }
}
