'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    FileText,
    Download,
    Share2,
    Loader2,
    AlertCircle,
    CheckCircle,
    Printer,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactions } from '@/lib/transaction-service';
import {
    Transaction,
    ExpenseCategory,
    EXPENSE_CATEGORIES,
    INCOME_TAX_BRACKETS,
    BASIC_DEDUCTION,
    SPECIAL_RECONSTRUCTION_TAX_RATE,
} from '@/lib/types';
import { generateTaxReturnPDF } from '@/lib/pdf-generator';

interface TaxSummary {
    fiscalYear: number;
    totalIncome: number;
    businessIncome: number;
    expenses: Partial<Record<ExpenseCategory, number>>;
    totalExpenses: number;
    businessProfit: number;
    deductions: {
        socialInsurance: number;
        lifeInsurance: number;
        earthquakeInsurance: number;
        spouse: number;
        dependent: number;
        basic: number;
        medical: number;
        donation: number;
    };
    totalDeductions: number;
    taxableIncome: number;
    incomeTax: number;
    reconstructionTax: number;
    totalTax: number;
}

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

function calculateTaxSummary(transactions: Transaction[], fiscalYear: number): TaxSummary {
    const approvedTx = transactions.filter(tx => tx.status === 'approved' || tx.status === 'modified');

    let totalIncome = 0;
    const expenses: Partial<Record<ExpenseCategory, number>> = {};

    for (const tx of approvedTx) {
        if (tx.amount < 0) {
            totalIncome += Math.abs(tx.amount);
        } else if (tx.category) {
            expenses[tx.category] = (expenses[tx.category] || 0) + tx.amount;
        }
    }

    const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + (val || 0), 0);
    const businessProfit = totalIncome - totalExpenses;

    // 控除情報（TODO: Firestoreから読み込む）
    const deductions = {
        socialInsurance: 0,
        lifeInsurance: 0,
        earthquakeInsurance: 0,
        spouse: 0,
        dependent: 0,
        basic: BASIC_DEDUCTION,
        medical: 0,
        donation: 0,
    };

    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
    const taxableIncome = Math.max(0, businessProfit - totalDeductions);
    const incomeTax = calculateIncomeTax(taxableIncome);
    const reconstructionTax = Math.floor(incomeTax * SPECIAL_RECONSTRUCTION_TAX_RATE);
    const totalTax = incomeTax + reconstructionTax;

    return {
        fiscalYear,
        totalIncome,
        businessIncome: totalIncome,
        expenses,
        totalExpenses,
        businessProfit,
        deductions,
        totalDeductions,
        taxableIncome,
        incomeTax,
        reconstructionTax,
        totalTax,
    };
}

export default function OutputPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<TaxSummary | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const fiscalYear = new Date().getFullYear();

    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                setLoading(true);
                const transactions = await getTransactions(user.uid, fiscalYear);
                const calculatedSummary = calculateTaxSummary(transactions, fiscalYear);
                setSummary(calculatedSummary);
            } catch (err) {
                console.error('Error loading transactions:', err);
                setError('データの読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, fiscalYear]);

    const handleGeneratePDF = async () => {
        if (!summary || !user) return;

        setGenerating(true);
        setError(null);

        try {
            const pdfBytes = await generateTaxReturnPDF({
                ...summary,
                userName: user.displayName || user.email || '',
            });

            // ArrayBufferを作成してBlobに変換
            const blob = new Blob([new Uint8Array(pdfBytes) as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (err) {
            console.error('PDF generation error:', err);
            setError('PDF生成に失敗しました');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!pdfUrl) return;

        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `確定申告書_${fiscalYear}年分.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShare = async () => {
        if (!pdfUrl) return;

        try {
            const response = await fetch(pdfUrl);
            const blob = await response.blob();
            const file = new File([blob], `確定申告書_${fiscalYear}年分.pdf`, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `確定申告書 ${fiscalYear}年分`,
                });
            } else {
                handleDownload();
            }
        } catch (err) {
            console.error('Share error:', err);
            handleDownload();
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP').format(amount);
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
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-emerald-50">
            {/* ヘッダー */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link href="/summary" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        確定申告書作成
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {/* 年度表示 */}
                <div className="text-center mb-6">
                    <span className="inline-block px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        {fiscalYear}年分 確定申告書
                    </span>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">データを読み込み中...</p>
                    </div>
                ) : error && !pdfUrl ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                ) : summary ? (
                    <>
                        {/* サマリー表示 */}
                        <div className="mb-6 p-5 bg-white rounded-xl border border-gray-200">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-emerald-500" />
                                申告内容サマリー
                            </h2>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">事業収入</span>
                                    <span className="font-medium">¥{formatCurrency(summary.totalIncome)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">必要経費</span>
                                    <span className="font-medium text-red-600">-¥{formatCurrency(summary.totalExpenses)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">事業所得</span>
                                    <span className="font-medium">¥{formatCurrency(summary.businessProfit)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">所得控除</span>
                                    <span className="font-medium text-purple-600">-¥{formatCurrency(summary.totalDeductions)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">課税所得</span>
                                    <span className="font-medium">¥{formatCurrency(summary.taxableIncome)}</span>
                                </div>
                                <div className="flex justify-between py-3 bg-emerald-50 -mx-5 px-5 rounded-b-xl">
                                    <span className="font-medium text-emerald-800">納付税額</span>
                                    <span className="text-lg font-bold text-emerald-700">¥{formatCurrency(summary.totalTax)}</span>
                                </div>
                            </div>
                        </div>

                        {/* PDF生成ボタン */}
                        {!pdfUrl ? (
                            <button
                                onClick={handleGeneratePDF}
                                disabled={generating}
                                className="w-full py-4 bg-emerald-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        PDF生成中...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-5 h-5" />
                                        PDFを生成する
                                    </>
                                )}
                            </button>
                        ) : (
                            <>
                                {/* PDF生成完了 */}
                                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                                    <div>
                                        <p className="font-medium text-emerald-800">PDFを生成しました</p>
                                        <p className="text-sm text-emerald-600">ダウンロードまたは共有できます</p>
                                    </div>
                                </div>

                                {/* PDFプレビュー */}
                                <div className="mb-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <iframe
                                        src={pdfUrl}
                                        className="w-full h-96"
                                        title="PDF Preview"
                                    />
                                </div>

                                {/* アクションボタン */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <button
                                        onClick={handleDownload}
                                        className="py-3 bg-blue-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                                    >
                                        <Download className="w-5 h-5" />
                                        ダウンロード
                                    </button>
                                    <button
                                        onClick={handleShare}
                                        className="py-3 bg-purple-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
                                    >
                                        <Share2 className="w-5 h-5" />
                                        共有
                                    </button>
                                </div>

                                <button
                                    onClick={() => window.print()}
                                    className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                                >
                                    <Printer className="w-5 h-5" />
                                    印刷する
                                </button>
                            </>
                        )}

                        {/* 注意事項 */}
                        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <h3 className="font-medium text-amber-800 mb-2">ご注意</h3>
                            <ul className="text-sm text-amber-700 space-y-1">
                                <li>• この書類は参考資料です</li>
                                <li>• 正式な申告は国税庁のe-Taxをご利用ください</li>
                                <li>• 税務の詳細は税理士にご相談ください</li>
                            </ul>
                        </div>
                    </>
                ) : null}
            </main>
        </div>
    );
}
