'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    FileText,
    ChevronRight,
    Loader2,
    AlertCircle,
    Edit3,
    Eye,
    List,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactions } from '@/lib/transaction-service';
import { getDeductions, saveFilingType, DEFAULT_DEDUCTIONS, DeductionData } from '@/lib/deduction-service';
import { getBusinessProfile, BusinessProfile, isAge65OrOlder } from '@/lib/business-profile-service';
import {
    Transaction,
    ExpenseCategory,
    EXPENSE_CATEGORIES,
    INCOME_TAX_BRACKETS,
    BASIC_DEDUCTION,
    BASIC_DEDUCTION_BRACKETS,
    SPECIAL_RECONSTRUCTION_TAX_RATE,
    FilingType,
    FILING_TYPE_INFO,
    IncomeEntry,
} from '@/lib/types';
import { TaxReturnForm, TaxReturnFormData, ExpenseBreakdown } from '@/components/TaxReturnForm';
import {
    getIncomeEntries,
    calculateIncomeSummary,
    IncomeSummary,
} from '@/lib/income-service';
import { getCryptoEntries, calculateTotalCryptoGain } from '@/lib/crypto-service';

function calculateIncomeTax(taxableIncome: number): number {
    if (taxableIncome <= 0) return 0;

    for (const bracket of INCOME_TAX_BRACKETS) {
        if (taxableIncome <= bracket.max) {
            return Math.floor(taxableIncome * bracket.rate - bracket.deduction);
        }
    }
    const lastBracket = INCOME_TAX_BRACKETS[INCOME_TAX_BRACKETS.length - 1];
    return Math.floor(taxableIncome * lastBracket.rate - lastBracket.deduction);
}

type ViewMode = 'form' | 'list';

// 基礎控除額を所得に応じて計算
function calculateBasicDeduction(totalIncome: number): number {
    for (const bracket of BASIC_DEDUCTION_BRACKETS) {
        if (totalIncome <= bracket.maxIncome) {
            return bracket.deduction;
        }
    }
    return 0;
}

export default function SummaryPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('form');

    // 申告種別（デフォルトは青色e-Tax）
    const [filingType, setFilingType] = useState<FilingType>('blue_etax');

    // 控除情報（Firestoreから読み込み）
    const [deductions, setDeductions] = useState<DeductionData['deductions']>(DEFAULT_DEDUCTIONS);

    // ビジネスプロフィール（源泉徴収税額含む）
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

    // 収入エントリー（年金・給与等 - Phase C）
    const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
    const [incomeSummary, setIncomeSummary] = useState<IncomeSummary | null>(null);

    // 仮想通貨の実現損益
    const [cryptoGain, setCryptoGain] = useState(0);

    const fiscalYear = new Date().getFullYear();

    // 取引データと控除データを読み込み
    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                setLoading(true);

                // 取引データ、控除データ、ビジネスプロフィール、収入エントリー、仮想通貨を並行して読み込み
                const [txs, deductionData, profile, incomes, cryptoEntries] = await Promise.all([
                    getTransactions(user.uid, fiscalYear),
                    getDeductions(user.uid, fiscalYear),
                    getBusinessProfile(user.uid, fiscalYear),
                    getIncomeEntries(user.uid, fiscalYear),
                    getCryptoEntries(user.uid, fiscalYear),
                ]);

                setTransactions(txs);
                setIncomeEntries(incomes);

                // 仮想通貨の損益計算
                const cryptoResult = calculateTotalCryptoGain(cryptoEntries);
                const cryptoRealizedGain = Math.max(0, cryptoResult.totalGain); // 利益のみ
                setCryptoGain(cryptoRealizedGain);

                if (profile) {
                    setBusinessProfile(profile);
                    setFilingType(profile.filingType);
                }

                if (deductionData) {
                    setDeductions(deductionData.deductions);
                    // プロフィールがない場合のみ控除データからfilingTypeを取得
                    if (!profile) {
                        setFilingType(deductionData.filingType);
                    }
                }

                // 収入サマリーを計算
                if ((incomes.length > 0 || cryptoRealizedGain > 0) && profile) {
                    const isOver65 = isAge65OrOlder(profile.birthDate, new Date(fiscalYear, 11, 31));
                    const approvedTx = txs.filter(tx => tx.status === 'approved' || tx.status === 'modified');
                    const businessExpenses = approvedTx
                        .filter(tx => tx.amount > 0)
                        .reduce((sum, tx) => sum + tx.amount, 0);
                    const blueDeduction = FILING_TYPE_INFO[profile.filingType].blueDeduction;

                    const summary = calculateIncomeSummary(incomes, businessExpenses, blueDeduction, isOver65);
                    // 仮想通貨の利益を雑所得に加算
                    const updatedSummary: IncomeSummary = {
                        ...summary,
                        miscellaneousRevenue: summary.miscellaneousRevenue + cryptoRealizedGain,
                        miscellaneousIncome: summary.miscellaneousIncome + cryptoRealizedGain,
                        totalRevenue: summary.totalRevenue + cryptoRealizedGain,
                        totalIncome: summary.totalIncome + cryptoRealizedGain,
                    };
                    setIncomeSummary(updatedSummary);
                }
            } catch (err) {
                console.error('Error loading data:', err);
                setError('データの読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, fiscalYear]);

    // 申告種別が変更されたらFirestoreに保存
    const handleFilingTypeChange = async (newFilingType: FilingType) => {
        setFilingType(newFilingType);
        if (user) {
            try {
                await saveFilingType(user.uid, fiscalYear, newFilingType);
            } catch (err) {
                console.error('Error saving filing type:', err);
            }
        }
    };

    // 確定申告書データを計算
    const formData: TaxReturnFormData = useMemo(() => {
        const approvedTx = transactions.filter(tx => tx.status === 'approved' || tx.status === 'modified');

        // 取引データからの事業収入（負の金額）
        let transactionIncome = 0;
        const expenses: Partial<Record<ExpenseCategory, number>> = {};

        for (const tx of approvedTx) {
            if (tx.amount < 0) {
                transactionIncome += Math.abs(tx.amount);
            } else if (tx.category) {
                expenses[tx.category] = (expenses[tx.category] || 0) + tx.amount;
            }
        }

        const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + (val || 0), 0);

        // 収入サマリーがある場合はそちらを優先（Phase C対応）
        const businessRevenue = incomeSummary?.businessRevenue ?? transactionIncome;
        const salaryRevenue = incomeSummary?.salaryRevenue ?? 0;
        const pensionRevenue = incomeSummary?.pensionRevenue ?? 0;
        // 仮想通貨の利益も含めた雑収入
        const miscRevenue = (incomeSummary?.miscellaneousRevenue ?? 0) || cryptoGain;

        // 青色申告特別控除を適用（事業所得から控除）
        const blueDeduction = FILING_TYPE_INFO[filingType].blueDeduction;
        // 青色申告特別控除は事業所得を上限とする
        const appliedBlueDeduction = Math.min(blueDeduction, Math.max(0, businessRevenue - totalExpenses));
        const businessIncome = Math.max(0, businessRevenue - totalExpenses - appliedBlueDeduction);

        // 給与所得控除・年金控除はincome-serviceで計算済み
        const salaryIncome = incomeSummary?.salaryIncome ?? 0;
        const pensionIncome = incomeSummary?.pensionIncome ?? 0;
        // 仮想通貨の利益も含めた雑所得
        const miscIncome = (incomeSummary?.miscellaneousIncome ?? 0) || cryptoGain;

        // 合計所得
        const totalIncome = businessIncome + salaryIncome + pensionIncome + miscIncome;

        // 基礎控除を所得に応じて計算
        const basicDeduction = calculateBasicDeduction(totalIncome);

        // 控除情報を更新（基礎控除を動的に）
        const updatedDeductions = {
            ...deductions,
            basic: basicDeduction,
        };

        const totalDeductions = Object.values(updatedDeductions).reduce((sum, val) => sum + (val || 0), 0);
        const taxableIncome = Math.max(0, totalIncome - totalDeductions);
        const incomeTax = calculateIncomeTax(taxableIncome);
        const reconstructionTax = Math.floor(incomeTax * SPECIAL_RECONSTRUCTION_TAX_RATE);
        const totalTax = incomeTax + reconstructionTax;

        // 源泉徴収税額（ビジネスプロフィール + 収入エントリーから取得）
        const profileWithholding = businessProfile?.withholdingTax || 0;
        const incomeWithholding = incomeSummary?.totalWithholdingTax ?? 0;
        const withholdingTax = profileWithholding + incomeWithholding;

        // 最終納付/還付額 = 所得税 + 復興税 - 源泉徴収税額
        const finalTaxDue = totalTax - withholdingTax;

        return {
            fiscalYear,
            filingType,
            name: user?.displayName || '',
            address: '',
            occupation: businessProfile?.businessType === 'pensioner' ? '年金受給者' :
                        businessProfile?.businessType === 'pensioner_with_work' ? '年金受給者（パート）' :
                        'フリーランス',
            businessRevenue,
            salaryRevenue,
            pensionRevenue,
            miscRevenue,
            blueDeduction: appliedBlueDeduction,
            businessIncome,
            salaryIncome,
            pensionIncome,
            miscIncome,
            totalIncome,
            expenses,
            totalExpenses,
            deductions: updatedDeductions,
            totalDeductions,
            taxableIncome,
            incomeTax,
            reconstructionTax,
            totalTax,
            withholdingTax,
            finalTaxDue,
            // 控除額情報（表示用）
            salaryDeduction: incomeSummary?.salaryDeduction ?? 0,
            pensionDeduction: incomeSummary?.pensionDeduction ?? 0,
            // 仮想通貨の実現損益
            cryptoGain,
        };
    }, [transactions, deductions, fiscalYear, user, filingType, businessProfile, incomeSummary, cryptoGain]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">ログインが必要です</h2>
                    <Link
                        href="/auth/login"
                        className="inline-block py-3 px-6 bg-blue-600 text-white rounded-xl font-medium"
                    >
                        ログイン
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
            {/* ヘッダー */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        確定申告書プレビュー
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4">
                {/* 申告種別選択 */}
                <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">申告種別</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(FILING_TYPE_INFO) as FilingType[]).map((type) => {
                            const info = FILING_TYPE_INFO[type];
                            const isSelected = filingType === type;
                            const isBlue = type !== 'white';
                            return (
                                <button
                                    key={type}
                                    onClick={() => handleFilingTypeChange(type)}
                                    className={`p-3 rounded-lg text-left transition-colors ${
                                        isSelected
                                            ? isBlue
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-600 text-white'
                                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    <div className="font-medium text-sm">{info.nameJa}</div>
                                    {info.blueDeduction > 0 && (
                                        <div className={`text-xs mt-1 ${isSelected ? 'text-blue-100' : 'text-blue-600'}`}>
                                            控除: {(info.blueDeduction / 10000).toFixed(0)}万円
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {formData.blueDeduction && formData.blueDeduction > 0 && (
                        <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                            <span className="text-sm text-blue-700">
                                青色申告特別控除: <span className="font-bold">{formatCurrency(formData.blueDeduction)}</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* 表示切替 */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setViewMode('form')}
                        className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                            viewMode === 'form'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                    >
                        <Eye className="w-4 h-4" />
                        申告書表示
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                            viewMode === 'list'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                    >
                        <List className="w-4 h-4" />
                        内訳表示
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">集計中...</p>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                ) : (
                    <>
                        {/* 取引件数 */}
                        <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200 flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                                仕分け済み: <span className="font-bold text-gray-800">{transactions.filter(t => t.status === 'approved' || t.status === 'modified').length}件</span>
                            </span>
                            <Link href="/swipe" className="text-sm text-blue-600 font-medium">
                                仕分けを続ける →
                            </Link>
                        </div>

                        {viewMode === 'form' ? (
                            /* 確定申告書フォーム表示 */
                            <div className="mb-4">
                                <TaxReturnForm data={formData} className="shadow-lg" />
                            </div>
                        ) : (
                            /* 内訳リスト表示 */
                            <div className="space-y-4 mb-4">
                                {/* 収入 */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xs">収</span>
                                        収入金額
                                    </h3>
                                    <div className="space-y-2">
                                        {formData.businessRevenue > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">事業収入</span>
                                                <span className="font-bold text-emerald-600">
                                                    {formatCurrency(formData.businessRevenue)}
                                                </span>
                                            </div>
                                        )}
                                        {formData.salaryRevenue > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">給与収入</span>
                                                <span className="font-bold text-emerald-600">
                                                    {formatCurrency(formData.salaryRevenue)}
                                                </span>
                                            </div>
                                        )}
                                        {(formData.pensionRevenue ?? 0) > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">年金収入</span>
                                                <span className="font-bold text-emerald-600">
                                                    {formatCurrency(formData.pensionRevenue ?? 0)}
                                                </span>
                                            </div>
                                        )}
                                        {(formData.cryptoGain ?? 0) > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">仮想通貨収入</span>
                                                <span className="font-bold text-emerald-600">
                                                    {formatCurrency(formData.cryptoGain ?? 0)}
                                                </span>
                                            </div>
                                        )}
                                        {((formData.miscRevenue ?? 0) - (formData.cryptoGain ?? 0)) > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">その他収入</span>
                                                <span className="font-bold text-emerald-600">
                                                    {formatCurrency((formData.miscRevenue ?? 0) - (formData.cryptoGain ?? 0))}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 経費内訳（事業収入がある場合のみ） */}
                                {formData.totalExpenses > 0 && (
                                    <ExpenseBreakdown expenses={formData.expenses} />
                                )}

                                {/* 青色申告特別控除 */}
                                {formData.blueDeduction && formData.blueDeduction > 0 && (
                                    <div className="bg-blue-100 rounded-xl border border-blue-300 p-4">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-blue-800">青色申告特別控除</span>
                                            <span className="text-xl font-bold text-blue-700">
                                                -{formatCurrency(formData.blueDeduction)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-blue-600 mt-1">
                                            {FILING_TYPE_INFO[filingType].nameJa}適用
                                        </p>
                                    </div>
                                )}

                                {/* 所得（複数表示） */}
                                <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                                    <h3 className="font-medium text-blue-800 mb-3">所得金額</h3>
                                    <div className="space-y-3">
                                        {formData.businessIncome > 0 && (
                                            <div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">事業所得</span>
                                                    <span className="font-bold text-blue-700">
                                                        {formatCurrency(formData.businessIncome)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    収入 {formatCurrency(formData.businessRevenue)} − 経費 {formatCurrency(formData.totalExpenses)}
                                                    {formData.blueDeduction && formData.blueDeduction > 0 && (
                                                        <> − 青色控除 {formatCurrency(formData.blueDeduction)}</>
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                        {formData.salaryIncome > 0 && (
                                            <div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">給与所得</span>
                                                    <span className="font-bold text-blue-700">
                                                        {formatCurrency(formData.salaryIncome)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    収入 {formatCurrency(formData.salaryRevenue)} − 給与所得控除 {formatCurrency(formData.salaryDeduction ?? 0)}
                                                </p>
                                            </div>
                                        )}
                                        {(formData.pensionIncome ?? 0) > 0 && (
                                            <div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">雑所得（年金）</span>
                                                    <span className="font-bold text-blue-700">
                                                        {formatCurrency(formData.pensionIncome ?? 0)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    年金収入 {formatCurrency(formData.pensionRevenue ?? 0)} − 公的年金等控除 {formatCurrency(formData.pensionDeduction ?? 0)}
                                                </p>
                                            </div>
                                        )}
                                        {(formData.cryptoGain ?? 0) > 0 && (
                                            <div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">雑所得（仮想通貨）</span>
                                                    <span className="font-bold text-blue-700">
                                                        {formatCurrency(formData.cryptoGain ?? 0)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    売却益・交換益（総平均法で計算）
                                                </p>
                                            </div>
                                        )}
                                        {((formData.miscIncome ?? 0) - (formData.cryptoGain ?? 0)) > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">雑所得（その他）</span>
                                                <span className="font-bold text-blue-700">
                                                    {formatCurrency((formData.miscIncome ?? 0) - (formData.cryptoGain ?? 0))}
                                                </span>
                                            </div>
                                        )}
                                        <div className="pt-2 border-t border-blue-200">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-blue-800">合計所得</span>
                                                <span className="text-xl font-bold text-blue-700">
                                                    {formatCurrency(formData.totalIncome)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 控除合計 */}
                                <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-purple-800">所得控除合計</span>
                                        <span className="text-xl font-bold text-purple-700">
                                            {formatCurrency(formData.totalDeductions)}
                                        </span>
                                    </div>
                                </div>

                                {/* 税額 */}
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
                                    <div className="space-y-2 text-sm mb-3">
                                        <div className="flex justify-between">
                                            <span className="text-indigo-100">課税所得</span>
                                            <span>{formatCurrency(formData.taxableIncome)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-indigo-100">所得税</span>
                                            <span>{formatCurrency(formData.incomeTax)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-indigo-100">復興特別所得税</span>
                                            <span>{formatCurrency(formData.reconstructionTax)}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-white/20 pt-2 mt-2">
                                            <span className="text-indigo-100">税額合計</span>
                                            <span>{formatCurrency(formData.totalTax)}</span>
                                        </div>
                                        {formData.withholdingTax > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-indigo-100">源泉徴収税額</span>
                                                <span>-{formatCurrency(formData.withholdingTax)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-3 border-t border-white/20 flex justify-between items-center">
                                        <span className="font-medium">
                                            {formData.finalTaxDue < 0 ? '還付金額' : '納付税額'}
                                        </span>
                                        <span className={`text-2xl font-bold ${formData.finalTaxDue < 0 ? 'text-green-300' : ''}`}>
                                            {formData.finalTaxDue < 0 ? (
                                                <>+{formatCurrency(Math.abs(formData.finalTaxDue))}</>
                                            ) : (
                                                formatCurrency(formData.finalTaxDue)
                                            )}
                                        </span>
                                    </div>
                                    {formData.finalTaxDue < 0 && (
                                        <p className="text-xs text-green-200 mt-2 text-right">
                                            源泉徴収された税金が戻ってきます
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 編集リンク */}
                        <div className="space-y-3 mb-4">
                            <Link
                                href="/profile"
                                className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <Edit3 className="w-5 h-5 text-blue-500" />
                                    <div>
                                        <div className="font-medium text-gray-800">事業設定を編集</div>
                                        <div className="text-xs text-gray-500">
                                            按分設定・源泉徴収税額を入力
                                            {businessProfile?.withholdingTax ? ` (源泉: ${formatCurrency(businessProfile.withholdingTax)})` : ''}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </Link>
                            <Link
                                href="/deductions"
                                className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <Edit3 className="w-5 h-5 text-purple-500" />
                                    <div>
                                        <div className="font-medium text-gray-800">控除情報を編集</div>
                                        <div className="text-xs text-gray-500">医療費、保険料などを入力</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </Link>
                        </div>

                        {/* アクションボタン */}
                        <div className="space-y-3">
                            <Link
                                href="/output"
                                className="w-full py-4 bg-blue-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                            >
                                <FileText className="w-5 h-5" />
                                PDFを出力する
                            </Link>
                        </div>

                        {/* 注意事項 */}
                        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <h3 className="font-medium text-amber-800 mb-2">入力途中でもOK</h3>
                            <p className="text-sm text-amber-700">
                                データを入力するたびに申告書がリアルタイムで更新されます。
                                すべての入力が終わってからPDFを出力してください。
                            </p>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
