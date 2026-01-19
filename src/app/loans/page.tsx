'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Landmark,
    Plus,
    Trash2,
    Loader2,
    CheckCircle,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Calendar,
    TrendingDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    Loan,
    LoanRepayment,
    LoanType,
    RepaymentFrequency,
    LOAN_TYPE_INFO,
    REPAYMENT_FREQUENCY_INFO,
    saveLoan,
    getLoans,
    deleteLoan,
    saveLoanRepayment,
    getLoanRepayments,
    deleteLoanRepayment,
    calculateYearlyRepaymentSummary,
    calculateEndingBalance,
    generateLoanId,
    generateRepaymentId,
} from '@/lib/loan-service';

type ViewMode = 'list' | 'add_loan' | 'add_repayment' | 'saving';

export default function LoansPage() {
    const { user } = useAuth();
    const fiscalYear = new Date().getFullYear();

    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // データ
    const [loans, setLoans] = useState<Loan[]>([]);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 新規借入フォーム
    const [lenderName, setLenderName] = useState('');
    const [loanType, setLoanType] = useState<LoanType>('bank');
    const [purpose, setPurpose] = useState('');
    const [originalAmount, setOriginalAmount] = useState('');
    const [currentBalance, setCurrentBalance] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [repaymentFrequency, setRepaymentFrequency] = useState<RepaymentFrequency>('monthly');
    const [monthlyRepayment, setMonthlyRepayment] = useState('');
    const [repaymentStartDate, setRepaymentStartDate] = useState('');
    const [repaymentEndDate, setRepaymentEndDate] = useState('');
    const [loanNotes, setLoanNotes] = useState('');

    // 返済記録フォーム
    const [selectedLoanId, setSelectedLoanId] = useState('');
    const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [principalAmount, setPrincipalAmount] = useState('');
    const [interestAmount, setInterestAmount] = useState('');
    const [repaymentNotes, setRepaymentNotes] = useState('');

    // データ読み込み
    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [loansData, repaymentsData] = await Promise.all([
                getLoans(user.uid, fiscalYear),
                getLoanRepayments(user.uid, fiscalYear),
            ]);
            setLoans(loansData);
            setRepayments(repaymentsData);
        } catch (err) {
            console.error('Failed to load data:', err);
            setError('データの読み込みに失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveLoan = async () => {
        if (!user) {
            setError('ログインが必要です');
            return;
        }

        if (!lenderName.trim()) {
            setError('借入先を入力してください');
            return;
        }

        const balance = parseFloat(currentBalance) || 0;
        if (balance <= 0) {
            setError('現在残高を入力してください');
            return;
        }

        setIsSaving(true);
        setError(null);
        setViewMode('saving');

        try {
            await saveLoan({
                id: generateLoanId(),
                userId: user.uid,
                fiscalYear,
                lenderName: lenderName.trim(),
                loanType,
                purpose: purpose.trim() || undefined,
                originalAmount: parseFloat(originalAmount) || balance,
                currentBalance: balance,
                interestRate: parseFloat(interestRate) || undefined,
                repaymentFrequency,
                monthlyRepayment: parseFloat(monthlyRepayment) || undefined,
                repaymentStartDate: repaymentStartDate || undefined,
                repaymentEndDate: repaymentEndDate || undefined,
                notes: loanNotes.trim() || undefined,
            });

            await loadData();
            resetLoanForm();
            setSuccessMessage('借入金を登録しました');
            setViewMode('list');
        } catch (err) {
            console.error('Save Error:', err);
            setError('保存に失敗しました');
            setViewMode('add_loan');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveRepayment = async () => {
        if (!user) {
            setError('ログインが必要です');
            return;
        }

        if (!selectedLoanId) {
            setError('借入先を選択してください');
            return;
        }

        const principal = parseFloat(principalAmount) || 0;
        const interest = parseFloat(interestAmount) || 0;

        if (principal <= 0 && interest <= 0) {
            setError('返済額を入力してください');
            return;
        }

        setIsSaving(true);
        setError(null);
        setViewMode('saving');

        try {
            const loan = loans.find(l => l.id === selectedLoanId);
            const loanRepayments = repayments.filter(r => r.loanId === selectedLoanId);
            const currentLoanBalance = loan ? calculateEndingBalance(loan, loanRepayments) : 0;

            await saveLoanRepayment({
                id: generateRepaymentId(),
                loanId: selectedLoanId,
                userId: user.uid,
                fiscalYear,
                date: repaymentDate,
                totalAmount: principal + interest,
                principalAmount: principal,
                interestAmount: interest,
                balanceAfter: Math.max(0, currentLoanBalance - principal),
                notes: repaymentNotes.trim() || undefined,
            });

            await loadData();
            resetRepaymentForm();
            setSuccessMessage('返済記録を保存しました。利息は経費として計上されます。');
            setViewMode('list');
        } catch (err) {
            console.error('Save Error:', err);
            setError('保存に失敗しました');
            setViewMode('add_repayment');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLoan = async (loanId: string) => {
        if (!confirm('この借入金を削除しますか？関連する返済記録も削除されます。')) return;

        try {
            await deleteLoan(loanId);
            // 関連する返済記録も削除
            const relatedRepayments = repayments.filter(r => r.loanId === loanId);
            for (const r of relatedRepayments) {
                await deleteLoanRepayment(r.id);
            }
            await loadData();
        } catch (err) {
            console.error('Delete Error:', err);
            setError('削除に失敗しました');
        }
    };

    const handleDeleteRepayment = async (repaymentId: string) => {
        if (!confirm('この返済記録を削除しますか？')) return;

        try {
            await deleteLoanRepayment(repaymentId);
            await loadData();
        } catch (err) {
            console.error('Delete Error:', err);
            setError('削除に失敗しました');
        }
    };

    const resetLoanForm = () => {
        setLenderName('');
        setLoanType('bank');
        setPurpose('');
        setOriginalAmount('');
        setCurrentBalance('');
        setInterestRate('');
        setRepaymentFrequency('monthly');
        setMonthlyRepayment('');
        setRepaymentStartDate('');
        setRepaymentEndDate('');
        setLoanNotes('');
    };

    const resetRepaymentForm = () => {
        setSelectedLoanId('');
        setRepaymentDate(new Date().toISOString().split('T')[0]);
        setPrincipalAmount('');
        setInterestAmount('');
        setRepaymentNotes('');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
        }).format(amount);
    };

    const getLoanRepaymentsByLoan = (loanId: string) => {
        return repayments.filter(r => r.loanId === loanId);
    };

    const yearlySummary = calculateYearlyRepaymentSummary(repayments);

    // 成功メッセージを自動で消す
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
            {/* ヘッダー */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link
                        href="/"
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        借入金管理
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {/* エラー表示 */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* 成功メッセージ */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-700">{successMessage}</p>
                    </div>
                )}

                {/* ローディング */}
                {isLoading && (
                    <div className="text-center py-12">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">読み込み中...</p>
                    </div>
                )}

                {/* 保存中 */}
                {viewMode === 'saving' && (
                    <div className="text-center py-12">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">保存中...</p>
                    </div>
                )}

                {/* 一覧表示 */}
                {viewMode === 'list' && !isLoading && (
                    <>
                        {/* 年間サマリー */}
                        {repayments.length > 0 && (
                            <div className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
                                <h2 className="text-sm font-medium opacity-90 mb-2">
                                    {fiscalYear}年の支払利息（経費計上可能）
                                </h2>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(yearlySummary.totalInterest)}
                                </p>
                                <div className="mt-2 flex gap-4 text-sm opacity-80">
                                    <span>元本返済: {formatCurrency(yearlySummary.totalPrincipal)}</span>
                                    <span>返済回数: {yearlySummary.repaymentCount}回</span>
                                </div>
                            </div>
                        )}

                        {/* アクションボタン */}
                        <div className="flex gap-3 mb-6">
                            <button
                                onClick={() => setViewMode('add_loan')}
                                className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Landmark className="w-5 h-5" />
                                借入を追加
                            </button>
                            <button
                                onClick={() => {
                                    if (loans.length === 0) {
                                        setError('先に借入金を登録してください');
                                        return;
                                    }
                                    setViewMode('add_repayment');
                                }}
                                className="flex-1 py-3 bg-white border-2 border-blue-600 text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <TrendingDown className="w-5 h-5" />
                                返済を記録
                            </button>
                        </div>

                        {/* 借入一覧 */}
                        {loans.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                <Landmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 mb-2">借入金はありません</p>
                                <p className="text-sm text-gray-400">
                                    銀行融資や借入がある場合は登録してください。
                                    <br />
                                    支払利息は経費として計上できます。
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {loans.map((loan) => {
                                    const loanRepayments = getLoanRepaymentsByLoan(loan.id);
                                    const endingBalance = calculateEndingBalance(loan, loanRepayments);
                                    const isExpanded = expandedLoanId === loan.id;

                                    return (
                                        <div
                                            key={loan.id}
                                            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                                        >
                                            {/* 借入ヘッダー */}
                                            <button
                                                onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                                                className="w-full p-4 flex items-center justify-between text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <Landmark className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-800">
                                                            {loan.lenderName}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {LOAN_TYPE_INFO[loan.loanType].nameJa}
                                                            {loan.interestRate && ` ・ 年利${loan.interestRate}%`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-500">残高</p>
                                                        <p className="font-bold text-gray-800">
                                                            {formatCurrency(endingBalance)}
                                                        </p>
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                            </button>

                                            {/* 詳細（展開時） */}
                                            {isExpanded && (
                                                <div className="border-t border-gray-200">
                                                    <div className="p-4 bg-gray-50 space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">当初借入額</span>
                                                            <span className="text-gray-800">
                                                                {formatCurrency(loan.originalAmount)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">期首残高</span>
                                                            <span className="text-gray-800">
                                                                {formatCurrency(loan.currentBalance)}
                                                            </span>
                                                        </div>
                                                        {loan.monthlyRepayment && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">毎月返済額</span>
                                                                <span className="text-gray-800">
                                                                    {formatCurrency(loan.monthlyRepayment)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {loan.purpose && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">用途</span>
                                                                <span className="text-gray-800">{loan.purpose}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 返済履歴 */}
                                                    {loanRepayments.length > 0 && (
                                                        <div className="p-4 border-t border-gray-200">
                                                            <p className="text-sm font-medium text-gray-700 mb-3">
                                                                返済履歴
                                                            </p>
                                                            <div className="space-y-2">
                                                                {loanRepayments.slice(0, 5).map((r) => (
                                                                    <div
                                                                        key={r.id}
                                                                        className="flex items-center justify-between text-sm"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <Calendar className="w-4 h-4 text-gray-400" />
                                                                            <span className="text-gray-600">
                                                                                {r.date}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-gray-800">
                                                                                元本 {formatCurrency(r.principalAmount)}
                                                                            </span>
                                                                            <span className="text-blue-600">
                                                                                利息 {formatCurrency(r.interestAmount)}
                                                                            </span>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteRepayment(r.id);
                                                                                }}
                                                                                className="p-1 text-gray-400 hover:text-red-500"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 削除ボタン */}
                                                    <div className="p-4 border-t border-gray-200">
                                                        <button
                                                            onClick={() => handleDeleteLoan(loan.id)}
                                                            className="text-sm text-red-500 hover:text-red-600"
                                                        >
                                                            この借入を削除
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 説明 */}
                        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-sm text-amber-800">
                                <strong>借入金の経費計上について</strong>
                                <br />
                                元本返済は経費にはなりませんが、支払利息は「利子割引料」として経費計上できます。
                                返済記録を入力すると、利息部分が自動的に経費として記録されます。
                            </p>
                        </div>
                    </>
                )}

                {/* 借入追加フォーム */}
                {viewMode === 'add_loan' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-800">借入を追加</h2>
                            <button
                                onClick={() => {
                                    resetLoanForm();
                                    setViewMode('list');
                                    setError(null);
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                キャンセル
                            </button>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                            {/* 借入先 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    借入先 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={lenderName}
                                    onChange={(e) => setLenderName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="○○銀行、日本政策金融公庫など"
                                />
                            </div>

                            {/* 借入種類 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    借入種類
                                </label>
                                <select
                                    value={loanType}
                                    onChange={(e) => setLoanType(e.target.value as LoanType)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {Object.entries(LOAN_TYPE_INFO).map(([key, info]) => (
                                        <option key={key} value={key}>
                                            {info.nameJa}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 用途 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    借入用途
                                </label>
                                <input
                                    type="text"
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="運転資金、設備投資など"
                                />
                            </div>

                            {/* 金額 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        当初借入額
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                            ¥
                                        </span>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            value={originalAmount}
                                            onChange={(e) => setOriginalAmount(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="5000000"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        現在残高 <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                            ¥
                                        </span>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            value={currentBalance}
                                            onChange={(e) => setCurrentBalance(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="3000000"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 金利・返済 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        年利
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            value={interestRate}
                                            onChange={(e) => setInterestRate(e.target.value)}
                                            className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="2.0"
                                            step="0.1"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                                            %
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        返済頻度
                                    </label>
                                    <select
                                        value={repaymentFrequency}
                                        onChange={(e) => setRepaymentFrequency(e.target.value as RepaymentFrequency)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {Object.entries(REPAYMENT_FREQUENCY_INFO).map(([key, info]) => (
                                            <option key={key} value={key}>
                                                {info.nameJa}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 毎月返済額 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    毎月返済額（元利合計）
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                        ¥
                                    </span>
                                    <input
                                        type="number"
                                            inputMode="numeric"
                                        value={monthlyRepayment}
                                        onChange={(e) => setMonthlyRepayment(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="50000"
                                    />
                                </div>
                            </div>

                            {/* 期間 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        返済開始日
                                    </label>
                                    <input
                                        type="date"
                                        value={repaymentStartDate}
                                        onChange={(e) => setRepaymentStartDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        返済終了予定日
                                    </label>
                                    <input
                                        type="date"
                                        value={repaymentEndDate}
                                        onChange={(e) => setRepaymentEndDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* 備考 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    備考
                                </label>
                                <textarea
                                    value={loanNotes}
                                    onChange={(e) => setLoanNotes(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={2}
                                    placeholder="メモがあれば入力"
                                />
                            </div>
                        </div>

                        {/* 保存ボタン */}
                        <div className="mt-6">
                            <button
                                onClick={handleSaveLoan}
                                disabled={isSaving || !lenderName.trim() || !currentBalance}
                                className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                借入を登録
                            </button>
                        </div>

                        <p className="mt-4 text-sm text-gray-500 text-center">
                            後から返済記録を追加することで利息を経費計上できます
                        </p>
                    </div>
                )}

                {/* 返済記録フォーム */}
                {viewMode === 'add_repayment' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-800">返済を記録</h2>
                            <button
                                onClick={() => {
                                    resetRepaymentForm();
                                    setViewMode('list');
                                    setError(null);
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                キャンセル
                            </button>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                            {/* 借入選択 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    借入先 <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedLoanId}
                                    onChange={(e) => setSelectedLoanId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">選択してください</option>
                                    {loans.map((loan) => (
                                        <option key={loan.id} value={loan.id}>
                                            {loan.lenderName} （残高: {formatCurrency(calculateEndingBalance(loan, getLoanRepaymentsByLoan(loan.id)))}）
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 返済日 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    返済日 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={repaymentDate}
                                    onChange={(e) => setRepaymentDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* 元本・利息 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        元本返済額
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                            ¥
                                        </span>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            value={principalAmount}
                                            onChange={(e) => setPrincipalAmount(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="40000"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">経費にならない</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        利息 <span className="text-blue-500">(経費)</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                            ¥
                                        </span>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            value={interestAmount}
                                            onChange={(e) => setInterestAmount(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="10000"
                                        />
                                    </div>
                                    <p className="text-xs text-blue-500 mt-1">経費として計上</p>
                                </div>
                            </div>

                            {/* 合計表示 */}
                            {(principalAmount || interestAmount) && (
                                <div className="bg-blue-50 rounded-lg p-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">返済合計</span>
                                        <span className="font-bold text-gray-800">
                                            {formatCurrency(
                                                (parseFloat(principalAmount) || 0) +
                                                (parseFloat(interestAmount) || 0)
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* 備考 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    備考
                                </label>
                                <textarea
                                    value={repaymentNotes}
                                    onChange={(e) => setRepaymentNotes(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={2}
                                    placeholder="メモがあれば入力"
                                />
                            </div>
                        </div>

                        {/* 保存ボタン */}
                        <div className="mt-6">
                            <button
                                onClick={handleSaveRepayment}
                                disabled={
                                    isSaving ||
                                    !selectedLoanId ||
                                    (!principalAmount && !interestAmount)
                                }
                                className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                返済を記録
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
