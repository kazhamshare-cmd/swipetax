'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Users,
    Loader2,
    CheckCircle,
    AlertCircle,
    Plus,
    Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    savePayrollEntry,
    getPayrollEntries,
    deletePayrollEntry,
    calculatePartTimePayroll,
    calculateFullTimePayroll,
} from '@/lib/payroll-service';
import { PayrollEntry, EmployeeType } from '@/lib/types';

type Step = 'form' | 'saving' | 'complete';

const POSITIONS = [
    { value: 'hall', label: 'ホール' },
    { value: 'kitchen', label: 'キッチン' },
    { value: 'manager', label: '店長' },
    { value: 'other', label: 'その他' },
];

export default function PayrollPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [step, setStep] = useState<Step>('form');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // フォーム状態
    const [employeeName, setEmployeeName] = useState('');
    const [employeeType, setEmployeeType] = useState<EmployeeType>('part_time');
    const [position, setPosition] = useState('');
    const [paymentDate, setPaymentDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [paymentMonth, setPaymentMonth] = useState(
        new Date().toISOString().slice(0, 7)
    );

    // アルバイト用
    const [workHours, setWorkHours] = useState('');
    const [hourlyRate, setHourlyRate] = useState('');

    // 社員用
    const [baseSalary, setBaseSalary] = useState('');
    const [incomeTax, setIncomeTax] = useState('');
    const [healthInsurance, setHealthInsurance] = useState('');
    const [pensionInsurance, setPensionInsurance] = useState('');
    const [employmentInsurance, setEmploymentInsurance] = useState('');
    const [otherDeduction, setOtherDeduction] = useState('');

    const [notes, setNotes] = useState('');

    // 計算結果
    const [grossAmount, setGrossAmount] = useState(0);
    const [netAmount, setNetAmount] = useState(0);
    const [totalDeductions, setTotalDeductions] = useState(0);

    // 履歴
    const [recentEntries, setRecentEntries] = useState<PayrollEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // 自動計算
    useEffect(() => {
        if (employeeType === 'part_time') {
            const hours = parseFloat(workHours) || 0;
            const rate = parseFloat(hourlyRate) || 0;
            const result = calculatePartTimePayroll(hours, rate);
            setGrossAmount(result.grossAmount);
            setNetAmount(result.netAmount);
            setTotalDeductions(0);
        } else {
            const salary = parseFloat(baseSalary) || 0;
            const deductions = {
                incomeTax: parseFloat(incomeTax) || 0,
                healthInsurance: parseFloat(healthInsurance) || 0,
                pensionInsurance: parseFloat(pensionInsurance) || 0,
                employmentInsurance: parseFloat(employmentInsurance) || 0,
                other: parseFloat(otherDeduction) || 0,
            };
            const result = calculateFullTimePayroll(salary, deductions);
            setGrossAmount(result.grossAmount);
            setNetAmount(result.netAmount);
            setTotalDeductions(result.totalDeductions);
        }
    }, [
        employeeType,
        workHours,
        hourlyRate,
        baseSalary,
        incomeTax,
        healthInsurance,
        pensionInsurance,
        employmentInsurance,
        otherDeduction,
    ]);

    // 履歴取得
    useEffect(() => {
        if (user) {
            loadRecentEntries();
        }
    }, [user]);

    const loadRecentEntries = async () => {
        if (!user) return;
        try {
            const entries = await getPayrollEntries(user.uid);
            setRecentEntries(entries.slice(0, 5));
        } catch (err) {
            console.error('Failed to load entries:', err);
        }
    };

    const handleSave = async () => {
        if (!user) {
            setError('ログインが必要です');
            return;
        }

        if (!employeeName.trim()) {
            setError('従業員名を入力してください');
            return;
        }

        if (grossAmount <= 0) {
            setError('給与額を入力してください');
            return;
        }

        setIsSaving(true);
        setError(null);
        setStep('saving');

        try {
            const fiscalYear = new Date(paymentDate).getFullYear();

            await savePayrollEntry(user.uid, {
                fiscalYear,
                employeeName: employeeName.trim(),
                employeeType,
                position: position || undefined,
                paymentDate,
                paymentMonth,
                workHours: employeeType === 'part_time' ? parseFloat(workHours) || undefined : undefined,
                hourlyRate: employeeType === 'part_time' ? parseFloat(hourlyRate) || undefined : undefined,
                baseSalary: employeeType === 'full_time' ? parseFloat(baseSalary) || undefined : undefined,
                grossAmount,
                deductions: employeeType === 'full_time' ? {
                    incomeTax: parseFloat(incomeTax) || undefined,
                    healthInsurance: parseFloat(healthInsurance) || undefined,
                    pensionInsurance: parseFloat(pensionInsurance) || undefined,
                    employmentInsurance: parseFloat(employmentInsurance) || undefined,
                    other: parseFloat(otherDeduction) || undefined,
                } : undefined,
                netAmount,
                notes: notes.trim() || undefined,
            });

            setStep('complete');
            await loadRecentEntries();
        } catch (err) {
            console.error('Save Error:', err);
            setError('保存に失敗しました');
            setStep('form');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddAnother = () => {
        // フォームをリセット
        setEmployeeName('');
        setPosition('');
        setWorkHours('');
        setHourlyRate('');
        setBaseSalary('');
        setIncomeTax('');
        setHealthInsurance('');
        setPensionInsurance('');
        setEmploymentInsurance('');
        setOtherDeduction('');
        setNotes('');
        setError(null);
        setStep('form');
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm('この給与データを削除しますか？')) return;

        try {
            await deletePayrollEntry(entryId);
            await loadRecentEntries();
        } catch (err) {
            console.error('Delete Error:', err);
            setError('削除に失敗しました');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
            {/* ヘッダー */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link
                        href="/restaurant"
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        給与・人件費入力
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

                {/* Step 1: 入力フォーム */}
                {step === 'form' && (
                    <div>
                        {/* 従業員タイプ切替 */}
                        <div className="mb-6">
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setEmployeeType('part_time')}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                                        employeeType === 'part_time'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-800'
                                    }`}
                                >
                                    アルバイト
                                </button>
                                <button
                                    onClick={() => setEmployeeType('full_time')}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                                        employeeType === 'full_time'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-800'
                                    }`}
                                >
                                    社員
                                </button>
                            </div>
                        </div>

                        {/* 入力フォーム */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                            {/* 従業員名 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    従業員名 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={employeeName}
                                    onChange={(e) => setEmployeeName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="山田 太郎"
                                />
                            </div>

                            {/* 役職 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    役職
                                </label>
                                <select
                                    value={position}
                                    onChange={(e) => setPosition(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">選択してください</option>
                                    {POSITIONS.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 支払日・対象月 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        支払日
                                    </label>
                                    <input
                                        type="date"
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        対象月
                                    </label>
                                    <input
                                        type="month"
                                        value={paymentMonth}
                                        onChange={(e) => setPaymentMonth(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* アルバイト用フィールド */}
                            {employeeType === 'part_time' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                勤務時間
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={workHours}
                                                    onChange={(e) => setWorkHours(e.target.value)}
                                                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="8"
                                                    step="0.5"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                                                    時間
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                時給
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                                    ¥
                                                </span>
                                                <input
                                                    type="number"
                                                    value={hourlyRate}
                                                    onChange={(e) => setHourlyRate(e.target.value)}
                                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="1000"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* 社員用フィールド */}
                            {employeeType === 'full_time' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            基本給
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                                ¥
                                            </span>
                                            <input
                                                type="number"
                                                value={baseSalary}
                                                onChange={(e) => setBaseSalary(e.target.value)}
                                                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="250000"
                                            />
                                        </div>
                                    </div>

                                    {/* 控除項目 */}
                                    <div className="pt-2 border-t border-gray-200">
                                        <p className="text-sm font-medium text-gray-700 mb-3">
                                            控除項目
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    所得税
                                                </label>
                                                <input
                                                    type="number"
                                                    value={incomeTax}
                                                    onChange={(e) => setIncomeTax(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    健康保険
                                                </label>
                                                <input
                                                    type="number"
                                                    value={healthInsurance}
                                                    onChange={(e) => setHealthInsurance(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    厚生年金
                                                </label>
                                                <input
                                                    type="number"
                                                    value={pensionInsurance}
                                                    onChange={(e) => setPensionInsurance(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    雇用保険
                                                </label>
                                                <input
                                                    type="number"
                                                    value={employmentInsurance}
                                                    onChange={(e) => setEmploymentInsurance(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    その他控除
                                                </label>
                                                <input
                                                    type="number"
                                                    value={otherDeduction}
                                                    onChange={(e) => setOtherDeduction(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* 備考 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    備考
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={2}
                                    placeholder="メモがあれば入力"
                                />
                            </div>
                        </div>

                        {/* 計算結果 */}
                        <div className="mt-4 bg-blue-50 rounded-xl border border-blue-100 p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">総支給額</span>
                                <span className="text-lg font-bold text-gray-800">
                                    {formatCurrency(grossAmount)}
                                </span>
                            </div>
                            {employeeType === 'full_time' && totalDeductions > 0 && (
                                <div className="flex justify-between items-center mb-2 text-sm">
                                    <span className="text-gray-500">控除合計</span>
                                    <span className="text-red-600">
                                        -{formatCurrency(totalDeductions)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                                <span className="text-sm font-medium text-gray-700">手取り額</span>
                                <span className="text-xl font-bold text-blue-600">
                                    {formatCurrency(netAmount)}
                                </span>
                            </div>
                        </div>

                        {/* 保存ボタン */}
                        <div className="mt-6">
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !employeeName.trim() || grossAmount <= 0}
                                className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                給与を保存
                            </button>
                        </div>

                        {/* 履歴セクション */}
                        {recentEntries.length > 0 && (
                            <div className="mt-8">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    <Users className="w-4 h-4" />
                                    最近の入力履歴 ({recentEntries.length}件)
                                </button>

                                {showHistory && (
                                    <div className="mt-3 space-y-2">
                                        {recentEntries.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-800">
                                                        {entry.employeeName}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {entry.paymentMonth} ・{' '}
                                                        {entry.employeeType === 'part_time'
                                                            ? 'アルバイト'
                                                            : '社員'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium text-gray-800">
                                                        {formatCurrency(entry.grossAmount)}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: 保存中 */}
                {step === 'saving' && (
                    <div className="text-center py-12">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">保存中...</p>
                    </div>
                )}

                {/* Step 3: 完了 */}
                {step === 'complete' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">保存しました</h2>
                        <p className="text-gray-500 mb-8">
                            給与データを保存しました。
                            <br />
                            経費として自動登録されています。
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={handleAddAnother}
                                className="w-full py-3 bg-white border-2 border-blue-600 text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                続けて入力する
                            </button>

                            <Link
                                href="/restaurant"
                                className="block w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors text-center"
                            >
                                メニューに戻る
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
