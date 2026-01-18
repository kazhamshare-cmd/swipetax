'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Upload,
    FileSpreadsheet,
    CheckCircle,
    AlertCircle,
    Loader2,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { parseCSV } from '@/lib/import/csv-parser';
import { CSVParseResult, MappedTransaction } from '@/lib/import/csv-mappers';
import { saveTransactions } from '@/lib/transaction-service';
import { estimateCategory } from '@/lib/ai-categorize-service';
import { TransactionStatus, DataSource } from '@/lib/types';

type Step = 'select-service' | 'upload' | 'preview' | 'importing' | 'complete';

interface ServiceOption {
    id: string;
    name: string;
    description: string;
    logo?: string;
}

const SERVICES: ServiceOption[] = [
    {
        id: 'freee',
        name: 'freee会計',
        description: '取引データエクスポートCSV',
    },
    {
        id: 'moneyforward',
        name: 'マネーフォワード',
        description: '明細データCSV',
    },
    {
        id: 'yayoi',
        name: '弥生会計',
        description: '仕訳日記帳エクスポートCSV',
    },
    {
        id: 'auto',
        name: '自動判定',
        description: 'CSVを解析して自動で形式を判定',
    },
];

export default function CSVImportPage() {
    const router = useRouter();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<Step>('select-service');
    const [selectedService, setSelectedService] = useState<string>('auto');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importProgress, setImportProgress] = useState({ saved: 0, total: 0 });

    const handleServiceSelect = (serviceId: string) => {
        setSelectedService(serviceId);
        setStep('upload');
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setError(null);
        setIsProcessing(true);

        try {
            const result = await parseCSV(file);
            setParseResult(result);

            if (result.success) {
                setStep('preview');
            } else if (result.requiresManualMapping) {
                setError('CSVの形式を自動判定できませんでした。手動でカラムを設定してください。');
            } else {
                setError(result.errors.join('\n'));
            }
        } catch (err) {
            setError('CSVの読み込みに失敗しました');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImport = async () => {
        if (!parseResult?.transactions || !user) {
            setError('ログインが必要です');
            return;
        }

        setIsProcessing(true);
        setStep('importing');
        setImportProgress({ saved: 0, total: parseResult.transactions.length });

        try {
            const fiscalYear = new Date().getFullYear();

            // AI分類を適用してトランザクションを作成
            const transactionsToSave = parseResult.transactions.map(tx => {
                const estimation = estimateCategory(tx.merchant, tx.description, tx.amount);

                return {
                    fiscalYear,
                    date: tx.date,
                    amount: estimation.isIncome ? -Math.abs(tx.amount) : Math.abs(tx.amount),
                    merchant: tx.merchant,
                    description: tx.description || undefined,
                    status: 'pending' as TransactionStatus,
                    aiCategory: estimation.category || undefined,
                    aiConfidence: estimation.confidence,
                    aiReasoning: estimation.reasoning,
                    source: 'csv' as DataSource,
                    sourceFile: selectedFile?.name,
                };
            });

            // Firestoreに保存（進捗通知付き）
            await saveTransactions(user.uid, transactionsToSave, (saved, total) => {
                setImportProgress({ saved, total });
            });

            setStep('complete');
        } catch (err) {
            console.error('Import error:', err);
            setError('取り込みに失敗しました');
            setStep('preview');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleComplete = () => {
        router.push('/swipe');
    };

    // ログインチェック
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
                    <Link
                        href="/import"
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        CSV読み込み
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {/* ステップインジケーター */}
                <div className="flex items-center justify-center mb-8">
                    {['サービス選択', 'アップロード', 'プレビュー'].map((label, index) => {
                        const stepNames: Step[] = ['select-service', 'upload', 'preview'];
                        const currentIndex = step === 'importing' || step === 'complete' ? 2 : stepNames.indexOf(step);
                        const isActive = index <= currentIndex;
                        const isCurrent = index === currentIndex;

                        return (
                            <div key={label} className="flex items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                    } ${isCurrent ? 'ring-2 ring-blue-300' : ''}`}
                                >
                                    {index + 1}
                                </div>
                                {index < 2 && (
                                    <div
                                        className={`w-12 h-0.5 ${
                                            index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
                                        }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* エラー表示 */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Step 1: サービス選択 */}
                {step === 'select-service' && (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500 mb-4">
                            お使いの会計サービスを選択してください
                        </p>
                        {SERVICES.map((service) => (
                            <button
                                key={service.id}
                                onClick={() => handleServiceSelect(service.id)}
                                className="w-full p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all text-left flex items-center gap-4"
                            >
                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                    <FileSpreadsheet className="w-6 h-6 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                                    <p className="text-sm text-gray-500">{service.description}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 2: ファイルアップロード */}
                {step === 'upload' && (
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="w-full p-8 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center gap-4"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                            ) : (
                                <Upload className="w-12 h-12 text-gray-400" />
                            )}
                            <div className="text-center">
                                <p className="font-medium text-gray-700">
                                    {isProcessing ? '解析中...' : 'CSVファイルを選択'}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {selectedFile
                                        ? selectedFile.name
                                        : 'クリックしてファイルを選択'}
                                </p>
                            </div>
                        </button>

                        <button
                            onClick={() => setStep('select-service')}
                            className="mt-4 w-full py-3 text-gray-600 hover:text-gray-800"
                        >
                            ← サービス選択に戻る
                        </button>
                    </div>
                )}

                {/* Step 3: プレビュー */}
                {step === 'preview' && parseResult && (
                    <div>
                        {/* 検出結果 */}
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            <div>
                                <p className="font-medium text-emerald-800">
                                    {parseResult.serviceName}の形式を検出しました
                                </p>
                                <p className="text-sm text-emerald-600">
                                    {parseResult.importedRows}件の取引を読み込みました
                                </p>
                            </div>
                        </div>

                        {/* AI分類プレビュー */}
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            <span className="text-sm text-blue-700">
                                AIが自動でカテゴリを推定します
                            </span>
                        </div>

                        {/* プレビューテーブル */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                <h3 className="font-medium text-gray-700">取引プレビュー</h3>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                                {parseResult.transactions?.slice(0, 10).map((tx, index) => (
                                    <TransactionRow key={index} transaction={tx} />
                                ))}
                            </div>
                            {(parseResult.transactions?.length || 0) > 10 && (
                                <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                                    他 {(parseResult.transactions?.length || 0) - 10} 件の取引
                                </div>
                            )}
                        </div>

                        {/* 大量データ警告 */}
                        {(parseResult.transactions?.length || 0) > 500 && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                <p className="text-sm text-amber-700">
                                    大量のデータ（{parseResult.transactions?.length}件）を取り込みます。
                                    処理に時間がかかる場合があります。
                                </p>
                            </div>
                        )}

                        {/* インポートボタン */}
                        <button
                            onClick={handleImport}
                            disabled={isProcessing}
                            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircle className="w-5 h-5" />
                            )}
                            {parseResult.importedRows}件の取引を取り込む
                        </button>

                        <button
                            onClick={() => {
                                setStep('upload');
                                setParseResult(null);
                            }}
                            className="mt-4 w-full py-3 text-gray-600 hover:text-gray-800"
                        >
                            ← 別のファイルを選択
                        </button>
                    </div>
                )}

                {/* Step 3.5: インポート中 */}
                {step === 'importing' && (
                    <div className="text-center py-12">
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
                        <h2 className="text-xl font-bold text-gray-800 mb-2">
                            取り込み中...
                        </h2>
                        <p className="text-gray-500 mb-4">
                            {importProgress.saved} / {importProgress.total} 件
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{
                                    width: `${(importProgress.saved / importProgress.total) * 100}%`,
                                }}
                            />
                        </div>
                        <p className="text-sm text-gray-400">
                            AIがカテゴリを分析しています...
                        </p>
                    </div>
                )}

                {/* Step 4: 完了 */}
                {step === 'complete' && (
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">
                            取り込み完了
                        </h2>
                        <p className="text-gray-500 mb-8">
                            {parseResult?.importedRows}件の取引を取り込みました。
                            <br />
                            スワイプで仕分けを始めましょう。
                        </p>
                        <button
                            onClick={handleComplete}
                            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            仕分けを始める
                        </button>
                        <Link
                            href="/transactions"
                            className="mt-4 block text-sm text-gray-600"
                        >
                            取引一覧を確認
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}

function TransactionRow({ transaction }: { transaction: MappedTransaction }) {
    const estimation = estimateCategory(transaction.merchant, transaction.description, transaction.amount);

    return (
        <div className="px-4 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{transaction.merchant}</p>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">{transaction.date}</span>
                    {estimation.category && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {estimation.reasoning}
                        </span>
                    )}
                    {estimation.isIncome && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">
                            収入
                        </span>
                    )}
                </div>
            </div>
            <div className="text-right">
                <p className={`font-medium ${estimation.isIncome ? 'text-emerald-600' : 'text-gray-800'}`}>
                    {estimation.isIncome ? '+' : ''}¥{Math.abs(transaction.amount).toLocaleString()}
                </p>
                {estimation.confidence < 60 && (
                    <p className="text-xs text-amber-600">要確認</p>
                )}
            </div>
        </div>
    );
}
