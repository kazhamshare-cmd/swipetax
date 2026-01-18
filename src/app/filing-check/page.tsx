'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    HelpCircle,
    AlertTriangle,
    Banknote,
    Building2,
    Briefcase,
    FileText,
    ArrowRight,
    Bitcoin,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { INCOME_TYPE_INFO } from '@/lib/types';
import {
    getIncomeEntries,
    calculateIncomeSummary,
    calculatePensionDeduction,
    calculateSalaryDeduction,
    needsFilingDeclaration,
    IncomeSummary,
} from '@/lib/income-service';
import { getBusinessProfile, isAge65OrOlder, BusinessType } from '@/lib/business-profile-service';
import { getTransactions } from '@/lib/transaction-service';
import { getCryptoEntries, calculateTotalCryptoGain, needsCryptoFiling } from '@/lib/crypto-service';

export default function FilingCheckPage() {
    const { user } = useAuth();
    const fiscalYear = new Date().getFullYear();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [birthDate, setBirthDate] = useState<string | undefined>();
    const [businessType, setBusinessType] = useState<BusinessType | undefined>();
    const [incomeSummary, setIncomeSummary] = useState<IncomeSummary | null>(null);
    const [businessExpenses, setBusinessExpenses] = useState(0);
    const [cryptoGain, setCryptoGain] = useState(0);

    // データ読み込み
    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                setLoading(true);

                const [incomeEntries, profile, transactions, cryptoEntries] = await Promise.all([
                    getIncomeEntries(user.uid, fiscalYear),
                    getBusinessProfile(user.uid, fiscalYear),
                    getTransactions(user.uid, fiscalYear),
                    getCryptoEntries(user.uid, fiscalYear),
                ]);

                setBirthDate(profile?.birthDate);
                setBusinessType(profile?.businessType);

                // 事業経費を計算（承認済み取引のうち正の金額のもの）
                const approvedTx = transactions.filter(tx => tx.status === 'approved' || tx.status === 'modified');
                const expenses = approvedTx
                    .filter(tx => tx.amount > 0)
                    .reduce((sum, tx) => sum + tx.amount, 0);
                setBusinessExpenses(expenses);

                // 仮想通貨の損益計算
                const cryptoResult = calculateTotalCryptoGain(cryptoEntries);
                const cryptoRealizedGain = Math.max(0, cryptoResult.totalGain); // 利益のみ（損失は繰越不可）
                setCryptoGain(cryptoRealizedGain);

                // 65歳判定
                const isOver65 = isAge65OrOlder(profile?.birthDate, new Date(fiscalYear, 11, 31));

                // サマリー計算（仮想通貨の利益をその他雑所得に加算）
                const summary = calculateIncomeSummary(incomeEntries, expenses, 0, isOver65);
                // 仮想通貨の利益を含めたサマリーを更新
                const updatedSummary: IncomeSummary = {
                    ...summary,
                    miscellaneousRevenue: summary.miscellaneousRevenue + cryptoRealizedGain,
                    miscellaneousIncome: summary.miscellaneousIncome + cryptoRealizedGain,
                    totalRevenue: summary.totalRevenue + cryptoRealizedGain,
                    totalIncome: summary.totalIncome + cryptoRealizedGain,
                };
                setIncomeSummary(updatedSummary);
            } catch (err) {
                console.error('Error loading data:', err);
                setError('データの読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, fiscalYear]);

    // 65歳以上かどうか
    const isOver65 = useMemo(() => {
        return isAge65OrOlder(birthDate, new Date(fiscalYear, 11, 31));
    }, [birthDate, fiscalYear]);

    // サラリーマンかどうかの判定
    const isSalariedWorker = useMemo(() => {
        return businessType === 'side_business' ||
            (incomeSummary && incomeSummary.salaryRevenue > 0 && incomeSummary.pensionRevenue === 0 && incomeSummary.businessRevenue === 0);
    }, [businessType, incomeSummary]);

    // 確定申告要否の判定
    const filingResult = useMemo(() => {
        if (!incomeSummary) return null;

        // サラリーマン（給与所得者）の場合
        if (isSalariedWorker) {
            // 給与以外の所得（雑所得 = 仮想通貨含む）
            const nonSalaryIncome = incomeSummary.miscellaneousIncome + incomeSummary.businessIncome + incomeSummary.pensionIncome;
            const threshold = 200000;

            if (nonSalaryIncome <= threshold) {
                return {
                    required: false,
                    reason: `給与以外の所得が${threshold.toLocaleString()}円以下のため、確定申告は不要です。`,
                    recommendation: '住民税の申告は必要な場合があります。利益がある場合はお住まいの市区町村に確認してください。',
                };
            }

            return {
                required: true,
                reason: `給与以外の所得が${threshold.toLocaleString()}円を超えているため、確定申告が必要です。`,
            };
        }

        // 年金受給者等の場合
        // 年金以外の所得（給与所得控除後、事業所得等）
        const otherIncome = incomeSummary.salaryIncome + incomeSummary.businessIncome + incomeSummary.miscellaneousIncome;

        return needsFilingDeclaration(
            incomeSummary.pensionRevenue,
            otherIncome,
            incomeSummary.totalWithholdingTax,
            isOver65
        );
    }, [incomeSummary, isOver65, isSalariedWorker]);

    // 金額フォーマット
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP').format(amount);
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">ログインが必要です</h2>
                    <Link href="/auth/login" className="inline-block py-3 px-6 bg-blue-600 text-white rounded-xl font-medium">
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
                        確定申告要否チェック
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4">
                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">計算中...</p>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                ) : incomeSummary && filingResult ? (
                    <>
                        {/* 判定結果 */}
                        <div className={`mb-6 p-6 rounded-2xl ${
                            filingResult.required
                                ? 'bg-amber-100 border-2 border-amber-300'
                                : filingResult.recommendation
                                    ? 'bg-blue-100 border-2 border-blue-300'
                                    : 'bg-emerald-100 border-2 border-emerald-300'
                        }`}>
                            <div className="flex items-center gap-4 mb-4">
                                {filingResult.required ? (
                                    <AlertTriangle className="w-12 h-12 text-amber-600" />
                                ) : filingResult.recommendation ? (
                                    <HelpCircle className="w-12 h-12 text-blue-600" />
                                ) : (
                                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                                )}
                                <div>
                                    <h2 className={`text-2xl font-bold ${
                                        filingResult.required
                                            ? 'text-amber-800'
                                            : filingResult.recommendation
                                                ? 'text-blue-800'
                                                : 'text-emerald-800'
                                    }`}>
                                        {filingResult.required
                                            ? '確定申告が必要です'
                                            : '確定申告は不要です'
                                        }
                                    </h2>
                                </div>
                            </div>

                            <p className={`text-sm ${
                                filingResult.required
                                    ? 'text-amber-700'
                                    : filingResult.recommendation
                                        ? 'text-blue-700'
                                        : 'text-emerald-700'
                            }`}>
                                {filingResult.reason}
                            </p>

                            {filingResult.recommendation && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-800 font-medium">
                                        {filingResult.recommendation}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 収入の内訳 */}
                        <div className="mb-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100">
                                <h3 className="font-bold text-gray-800">収入の内訳</h3>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {/* 年金収入 */}
                                {incomeSummary.pensionRevenue > 0 && (
                                    <div className="p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Building2 className="w-5 h-5 text-emerald-600" />
                                            <span className="font-medium text-gray-800">年金収入</span>
                                        </div>
                                        <div className="ml-8 space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">収入金額</span>
                                                <span className="font-medium">{formatCurrency(incomeSummary.pensionRevenue)}円</span>
                                            </div>
                                            <div className="flex justify-between text-emerald-600">
                                                <span>公的年金等控除</span>
                                                <span>-{formatCurrency(incomeSummary.pensionDeduction)}円</span>
                                            </div>
                                            <div className="flex justify-between font-bold pt-1 border-t border-gray-100">
                                                <span className="text-gray-700">年金所得（雑所得）</span>
                                                <span className="text-blue-600">{formatCurrency(incomeSummary.pensionIncome)}円</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 給与収入 */}
                                {incomeSummary.salaryRevenue > 0 && (
                                    <div className="p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Banknote className="w-5 h-5 text-blue-600" />
                                            <span className="font-medium text-gray-800">給与収入</span>
                                        </div>
                                        <div className="ml-8 space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">収入金額</span>
                                                <span className="font-medium">{formatCurrency(incomeSummary.salaryRevenue)}円</span>
                                            </div>
                                            <div className="flex justify-between text-emerald-600">
                                                <span>給与所得控除</span>
                                                <span>-{formatCurrency(incomeSummary.salaryDeduction)}円</span>
                                            </div>
                                            <div className="flex justify-between font-bold pt-1 border-t border-gray-100">
                                                <span className="text-gray-700">給与所得</span>
                                                <span className="text-blue-600">{formatCurrency(incomeSummary.salaryIncome)}円</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 事業収入 */}
                                {incomeSummary.businessRevenue > 0 && (
                                    <div className="p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Briefcase className="w-5 h-5 text-purple-600" />
                                            <span className="font-medium text-gray-800">事業収入</span>
                                        </div>
                                        <div className="ml-8 space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">収入金額</span>
                                                <span className="font-medium">{formatCurrency(incomeSummary.businessRevenue)}円</span>
                                            </div>
                                            {businessExpenses > 0 && (
                                                <div className="flex justify-between text-emerald-600">
                                                    <span>経費</span>
                                                    <span>-{formatCurrency(businessExpenses)}円</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-bold pt-1 border-t border-gray-100">
                                                <span className="text-gray-700">事業所得</span>
                                                <span className="text-blue-600">{formatCurrency(incomeSummary.businessIncome)}円</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 仮想通貨（暗号資産） */}
                                {cryptoGain > 0 && (
                                    <div className="p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Bitcoin className="w-5 h-5 text-orange-500" />
                                            <span className="font-medium text-gray-800">仮想通貨（雑所得）</span>
                                        </div>
                                        <div className="ml-8">
                                            <div className="flex justify-between text-sm font-bold">
                                                <span className="text-gray-700">実現損益</span>
                                                <span className="text-blue-600">{formatCurrency(cryptoGain)}円</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* その他（仮想通貨以外の雑所得） */}
                                {(incomeSummary.miscellaneousRevenue - cryptoGain) > 0 && (
                                    <div className="p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <FileText className="w-5 h-5 text-gray-600" />
                                            <span className="font-medium text-gray-800">その他（雑所得）</span>
                                        </div>
                                        <div className="ml-8">
                                            <div className="flex justify-between text-sm font-bold">
                                                <span className="text-gray-700">所得金額</span>
                                                <span className="text-blue-600">{formatCurrency(incomeSummary.miscellaneousIncome - cryptoGain)}円</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 合計所得 */}
                        <div className="mb-4 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">合計所得金額</span>
                                <span className="text-2xl font-bold">{formatCurrency(incomeSummary.totalIncome)}円</span>
                            </div>
                            {incomeSummary.totalWithholdingTax > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/20 flex justify-between items-center text-sm">
                                    <span className="text-blue-100">源泉徴収税額</span>
                                    <span className="font-medium">{formatCurrency(incomeSummary.totalWithholdingTax)}円</span>
                                </div>
                            )}
                        </div>

                        {/* 判定基準の説明 */}
                        <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-gray-500" />
                                {isSalariedWorker ? '給与所得者の確定申告不要制度' : '年金受給者の確定申告不要制度'}
                            </h3>
                            <div className="text-sm text-gray-600 space-y-2">
                                {isSalariedWorker ? (
                                    <>
                                        <p>給与所得者で以下を満たす場合、確定申告は不要です：</p>
                                        <ul className="list-disc ml-5 space-y-1">
                                            <li><span className="font-medium">給与を1か所から受けている</span></li>
                                            <li><span className="font-medium">給与以外の所得が20万円以下</span></li>
                                        </ul>
                                        <p className="pt-2 text-gray-500">
                                            ※仮想通貨の利益は「雑所得」として給与以外の所得に含まれます。
                                            <br />
                                            ※確定申告が不要でも、住民税の申告が必要な場合があります。
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p>以下の両方を満たす場合、確定申告は不要です：</p>
                                        <ul className="list-disc ml-5 space-y-1">
                                            <li><span className="font-medium">公的年金等の収入が400万円以下</span></li>
                                            <li><span className="font-medium">公的年金等以外の所得が20万円以下</span></li>
                                        </ul>
                                        <p className="pt-2 text-gray-500">
                                            ただし、源泉徴収された税金が還付される場合は、確定申告をすることで還付を受けられます。
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 65歳判定（年金受給者のみ） */}
                        {!isSalariedWorker && (
                            <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                <p className="text-sm text-emerald-700">
                                    <span className="font-medium">
                                        {isOver65 ? '65歳以上' : '65歳未満'}
                                    </span>
                                    として計算しています
                                    {birthDate && (
                                        <span className="text-emerald-600 ml-1">
                                            （生年月日: {birthDate}）
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}

                        {/* アクションリンク */}
                        <div className="space-y-3">
                            <Link
                                href="/crypto"
                                className="block p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-gray-800 flex items-center gap-2">
                                            <Bitcoin className="w-4 h-4 text-orange-500" />
                                            仮想通貨取引を入力
                                        </div>
                                        <div className="text-sm text-gray-500">購入・売却・交換の記録を管理</div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-400" />
                                </div>
                            </Link>

                            <Link
                                href="/income"
                                className="block p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-gray-800">収入を追加・編集</div>
                                        <div className="text-sm text-gray-500">年金・給与・その他の収入を入力</div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-400" />
                                </div>
                            </Link>

                            <Link
                                href="/summary"
                                className="block p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-gray-800">確定申告書プレビュー</div>
                                        <div className="text-sm text-gray-500">申告書の内容を確認</div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-400" />
                                </div>
                            </Link>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">収入データがありません</p>
                        <Link
                            href="/income"
                            className="mt-4 inline-block py-3 px-6 bg-blue-600 text-white rounded-xl font-medium"
                        >
                            収入を入力する
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
