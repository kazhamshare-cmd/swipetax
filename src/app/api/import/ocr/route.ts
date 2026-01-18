import { NextRequest, NextResponse } from 'next/server';
import { processDocumentOCR } from '@/lib/import/ocr-service';
import { DocumentType } from '@/lib/import/document-types';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60秒タイムアウト

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const image = formData.get('image') as Blob | null;
        const documentType = formData.get('documentType') as DocumentType | null;

        if (!image) {
            return NextResponse.json(
                { success: false, error: '画像が提供されていません' },
                { status: 400 }
            );
        }

        if (!documentType || !['receipt', 'bank_statement', 'tax_return'].includes(documentType)) {
            return NextResponse.json(
                { success: false, error: '無効なドキュメントタイプです' },
                { status: 400 }
            );
        }

        // Blob を Base64 に変換
        const arrayBuffer = await image.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        // OCR 処理
        const result = await processDocumentOCR(base64, documentType);

        return NextResponse.json(result);
    } catch (error) {
        console.error('OCR API Error:', error);

        const errorMessage = error instanceof Error ? error.message : 'OCR処理中にエラーが発生しました';

        // OpenAI API キーが設定されていない場合
        if (errorMessage.includes('OPENAI_API_KEY')) {
            return NextResponse.json(
                { success: false, error: 'APIキーが設定されていません。管理者に連絡してください。' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
