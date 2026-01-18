// 確定申告書PDF生成（確定申告書B様式）
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ExpenseCategory, EXPENSE_CATEGORIES, FilingType, FILING_TYPE_INFO } from './types';

interface TaxReturnData {
    fiscalYear: number;
    userName: string;
    userAddress?: string;
    occupation?: string;
    filingType?: FilingType;        // 申告種別
    blueDeduction?: number;         // 青色申告特別控除額
    totalIncome: number;
    businessIncome: number;
    salaryIncome?: number;
    expenses: Partial<Record<ExpenseCategory, number>>;
    totalExpenses: number;
    businessProfit: number;
    deductions: {
        socialInsurance?: number;
        lifeInsurance?: number;
        earthquakeInsurance?: number;
        spouse?: number;
        dependent?: number;
        basic: number;
        medical?: number;
        donation?: number;
    };
    totalDeductions: number;
    taxableIncome: number;
    incomeTax: number;
    reconstructionTax: number;
    totalTax: number;
    withholdingTax?: number;
    finalTaxDue?: number;
}

// 日本語フォントをロード（Google Fontsから）
async function loadJapaneseFont(): Promise<ArrayBuffer> {
    // Noto Sans JP Regular
    const fontUrl = 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-400-normal.woff2';

    try {
        const response = await fetch(fontUrl);
        if (!response.ok) {
            throw new Error('Font fetch failed');
        }
        return await response.arrayBuffer();
    } catch {
        // フォールバック: 別のCDNを試す
        const fallbackUrl = 'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.woff2';
        const response = await fetch(fallbackUrl);
        return await response.arrayBuffer();
    }
}

// 金額フォーマット
function formatAmount(amount: number | undefined): string {
    if (!amount || amount === 0) return '';
    return new Intl.NumberFormat('ja-JP').format(Math.abs(amount));
}

// テキストを右寄せで描画
function drawRightAlignedText(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    font: PDFFont,
    size: number,
    color = rgb(0, 0, 0)
) {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
        x: x - textWidth,
        y,
        size,
        font,
        color,
    });
}

// テーブルセルを描画
function drawCell(
    page: PDFPage,
    x: number,
    y: number,
    width: number,
    height: number,
    options?: {
        fillColor?: ReturnType<typeof rgb>;
        borderColor?: ReturnType<typeof rgb>;
        borderWidth?: number;
    }
) {
    const { fillColor, borderColor = rgb(0.3, 0.3, 0.3), borderWidth = 0.5 } = options || {};

    if (fillColor) {
        page.drawRectangle({
            x,
            y,
            width,
            height,
            color: fillColor,
        });
    }

    page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor,
        borderWidth,
    });
}

/**
 * 確定申告書B様式のPDFを生成
 */
export async function generateTaxReturnPDF(data: TaxReturnData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    // fontkitを登録して日本語フォント対応
    pdfDoc.registerFontkit(fontkit);

    // 日本語フォントをロード
    let jpFont: PDFFont;
    let jpFontBold: PDFFont;

    try {
        const fontData = await loadJapaneseFont();
        jpFont = await pdfDoc.embedFont(fontData);
        jpFontBold = jpFont; // 同じフォントを使用（Boldは別途必要）
    } catch (error) {
        console.error('Japanese font loading failed, using standard font:', error);
        // フォールバック: 標準フォント
        jpFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        jpFontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // A4サイズのページ
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // 色定義
    const headerBg = rgb(0.93, 0.95, 0.97);
    const blueBg = rgb(0.9, 0.94, 1);
    const greenBg = rgb(0.9, 0.97, 0.93);
    const purpleBg = rgb(0.95, 0.9, 1);
    const redBg = rgb(1, 0.93, 0.93);
    const yellowBg = rgb(1, 0.98, 0.9);
    const black = rgb(0, 0, 0);
    const blue = rgb(0.2, 0.4, 0.8);
    const darkGray = rgb(0.3, 0.3, 0.3);

    let y = height - 40;
    const leftMargin = 40;
    const rightMargin = width - 40;
    const contentWidth = rightMargin - leftMargin;

    // ============================================
    // ヘッダー部分
    // ============================================

    // タイトル背景
    drawCell(page, leftMargin, y - 50, contentWidth, 55, { fillColor: headerBg });

    // タイトル
    const reiwaYear = data.fiscalYear - 2018;
    page.drawText(`令和${reiwaYear}年分の所得税及び復興特別所得税の`, {
        x: leftMargin + 100,
        y: y - 20,
        size: 12,
        font: jpFont,
        color: black,
    });

    page.drawText('確定申告書B', {
        x: leftMargin + 180,
        y: y - 40,
        size: 20,
        font: jpFontBold,
        color: black,
    });

    page.drawText('（第一表）', {
        x: leftMargin + 310,
        y: y - 40,
        size: 10,
        font: jpFont,
        color: darkGray,
    });

    y -= 70;

    // ============================================
    // 基本情報
    // ============================================

    const infoHeight = 45;
    drawCell(page, leftMargin, y - infoHeight, contentWidth, infoHeight);

    // 氏名
    page.drawText('氏名', {
        x: leftMargin + 5,
        y: y - 15,
        size: 8,
        font: jpFont,
        color: darkGray,
    });
    page.drawText(data.userName || '', {
        x: leftMargin + 40,
        y: y - 15,
        size: 11,
        font: jpFont,
        color: black,
    });

    // 職業
    page.drawText('職業', {
        x: leftMargin + 200,
        y: y - 15,
        size: 8,
        font: jpFont,
        color: darkGray,
    });
    page.drawText(data.occupation || 'フリーランス', {
        x: leftMargin + 230,
        y: y - 15,
        size: 11,
        font: jpFont,
        color: black,
    });

    // 住所
    page.drawText('住所', {
        x: leftMargin + 5,
        y: y - 35,
        size: 8,
        font: jpFont,
        color: darkGray,
    });
    page.drawText(data.userAddress || '', {
        x: leftMargin + 40,
        y: y - 35,
        size: 10,
        font: jpFont,
        color: black,
    });

    y -= infoHeight + 10;

    // ============================================
    // 2列レイアウト（収入・所得 | 控除）
    // ============================================

    const colWidth = contentWidth / 2 - 5;
    const rowHeight = 20;

    // 左列: 収入金額等
    let leftY = y;

    // 収入金額等ヘッダー
    drawCell(page, leftMargin, leftY - 25, colWidth, 25, { fillColor: blueBg });
    page.drawText('収入金額等', {
        x: leftMargin + colWidth / 2 - 25,
        y: leftY - 18,
        size: 11,
        font: jpFontBold,
        color: black,
    });
    leftY -= 25;

    // 事業収入
    drawCell(page, leftMargin, leftY - rowHeight, 25, rowHeight, { fillColor: headerBg });
    drawCell(page, leftMargin + 25, leftY - rowHeight, colWidth - 105, rowHeight);
    drawCell(page, leftMargin + colWidth - 80, leftY - rowHeight, 80, rowHeight);

    page.drawText('ア', {
        x: leftMargin + 8,
        y: leftY - 15,
        size: 9,
        font: jpFont,
        color: black,
    });
    page.drawText('事業（営業等）', {
        x: leftMargin + 30,
        y: leftY - 15,
        size: 9,
        font: jpFont,
        color: black,
    });
    drawRightAlignedText(page, formatAmount(data.businessIncome), leftMargin + colWidth - 5, leftY - 15, font, 10);
    leftY -= rowHeight;

    // 給与
    drawCell(page, leftMargin, leftY - rowHeight, 25, rowHeight, { fillColor: headerBg });
    drawCell(page, leftMargin + 25, leftY - rowHeight, colWidth - 105, rowHeight);
    drawCell(page, leftMargin + colWidth - 80, leftY - rowHeight, 80, rowHeight);

    page.drawText('カ', {
        x: leftMargin + 8,
        y: leftY - 15,
        size: 9,
        font: jpFont,
        color: black,
    });
    page.drawText('給与', {
        x: leftMargin + 30,
        y: leftY - 15,
        size: 9,
        font: jpFont,
        color: black,
    });
    drawRightAlignedText(page, formatAmount(data.salaryIncome), leftMargin + colWidth - 5, leftY - 15, font, 10);
    leftY -= rowHeight;

    // 青色申告特別控除（該当する場合）
    if (data.blueDeduction && data.blueDeduction > 0) {
        leftY -= 3;
        const blueDeductionBg = rgb(0.85, 0.92, 1);
        drawCell(page, leftMargin, leftY - 18, colWidth, 18, { fillColor: blueDeductionBg });
        const filingTypeName = data.filingType ? FILING_TYPE_INFO[data.filingType].nameJa : '青色申告';
        page.drawText(`青色申告特別控除: ${formatAmount(data.blueDeduction)}円 (${filingTypeName})`, {
            x: leftMargin + 5,
            y: leftY - 13,
            size: 7,
            font: jpFont,
            color: rgb(0.1, 0.3, 0.6),
        });
        leftY -= 18;
    }

    // 所得金額等ヘッダー
    leftY -= 5;
    drawCell(page, leftMargin, leftY - 25, colWidth, 25, { fillColor: greenBg });
    page.drawText('所得金額等', {
        x: leftMargin + colWidth / 2 - 25,
        y: leftY - 18,
        size: 11,
        font: jpFontBold,
        color: black,
    });
    leftY -= 25;

    // 事業所得
    drawCell(page, leftMargin, leftY - rowHeight, 25, rowHeight, { fillColor: headerBg });
    drawCell(page, leftMargin + 25, leftY - rowHeight, colWidth - 105, rowHeight);
    drawCell(page, leftMargin + colWidth - 80, leftY - rowHeight, 80, rowHeight);

    page.drawText('①', {
        x: leftMargin + 7,
        y: leftY - 15,
        size: 9,
        font: jpFont,
        color: black,
    });
    page.drawText('事業（営業等）', {
        x: leftMargin + 30,
        y: leftY - 15,
        size: 9,
        font: jpFont,
        color: black,
    });
    drawRightAlignedText(page, formatAmount(data.businessProfit), leftMargin + colWidth - 5, leftY - 15, font, 10);
    leftY -= rowHeight;

    // 給与所得
    drawCell(page, leftMargin, leftY - rowHeight, 25, rowHeight, { fillColor: headerBg });
    drawCell(page, leftMargin + 25, leftY - rowHeight, colWidth - 105, rowHeight);
    drawCell(page, leftMargin + colWidth - 80, leftY - rowHeight, 80, rowHeight);

    page.drawText('⑥', {
        x: leftMargin + 7,
        y: leftY - 15,
        size: 9,
        font: jpFont,
        color: black,
    });
    page.drawText('給与', {
        x: leftMargin + 30,
        y: leftY - 15,
        size: 9,
        font: jpFont,
        color: black,
    });
    leftY -= rowHeight;

    // 合計所得
    drawCell(page, leftMargin, leftY - rowHeight, 25, rowHeight, { fillColor: headerBg });
    drawCell(page, leftMargin + 25, leftY - rowHeight, colWidth - 105, rowHeight, { fillColor: yellowBg });
    drawCell(page, leftMargin + colWidth - 80, leftY - rowHeight, 80, rowHeight, { fillColor: yellowBg });

    page.drawText('⑫', {
        x: leftMargin + 7,
        y: leftY - 15,
        size: 9,
        font: jpFont,
        color: black,
    });
    page.drawText('合計', {
        x: leftMargin + 30,
        y: leftY - 15,
        size: 10,
        font: jpFontBold,
        color: black,
    });
    drawRightAlignedText(page, formatAmount(data.businessProfit), leftMargin + colWidth - 5, leftY - 15, fontBold, 11);
    leftY -= rowHeight;

    // ============================================
    // 右列: 所得から差し引かれる金額
    // ============================================

    let rightY = y;
    const rightX = leftMargin + colWidth + 10;

    // 控除ヘッダー
    drawCell(page, rightX, rightY - 25, colWidth, 25, { fillColor: purpleBg });
    page.drawText('所得から差し引かれる金額', {
        x: rightX + colWidth / 2 - 60,
        y: rightY - 18,
        size: 10,
        font: jpFontBold,
        color: black,
    });
    rightY -= 25;

    // 控除項目
    const deductionItems = [
        { label: '⑬', name: '社会保険料控除', value: data.deductions.socialInsurance },
        { label: '⑮', name: '生命保険料控除', value: data.deductions.lifeInsurance },
        { label: '⑯', name: '地震保険料控除', value: data.deductions.earthquakeInsurance },
        { label: '㉑', name: '配偶者控除', value: data.deductions.spouse },
        { label: '㉓', name: '扶養控除', value: data.deductions.dependent },
        { label: '㉔', name: '基礎控除', value: data.deductions.basic },
    ];

    for (const item of deductionItems) {
        drawCell(page, rightX, rightY - rowHeight, 20, rowHeight, { fillColor: headerBg });
        drawCell(page, rightX + 20, rightY - rowHeight, colWidth - 90, rowHeight);
        drawCell(page, rightX + colWidth - 70, rightY - rowHeight, 70, rowHeight);

        page.drawText(item.label, {
            x: rightX + 5,
            y: rightY - 15,
            size: 8,
            font: jpFont,
            color: black,
        });
        page.drawText(item.name, {
            x: rightX + 23,
            y: rightY - 15,
            size: 9,
            font: jpFont,
            color: black,
        });
        drawRightAlignedText(page, formatAmount(item.value), rightX + colWidth - 5, rightY - 15, font, 10);
        rightY -= rowHeight;
    }

    // 控除合計
    drawCell(page, rightX, rightY - rowHeight, 20, rowHeight, { fillColor: headerBg });
    drawCell(page, rightX + 20, rightY - rowHeight, colWidth - 90, rowHeight, { fillColor: yellowBg });
    drawCell(page, rightX + colWidth - 70, rightY - rowHeight, 70, rowHeight, { fillColor: yellowBg });

    page.drawText('㉕', {
        x: rightX + 5,
        y: rightY - 15,
        size: 8,
        font: jpFont,
        color: black,
    });
    page.drawText('合計', {
        x: rightX + 23,
        y: rightY - 15,
        size: 10,
        font: jpFontBold,
        color: black,
    });
    drawRightAlignedText(page, formatAmount(data.totalDeductions), rightX + colWidth - 5, rightY - 15, fontBold, 11);
    rightY -= rowHeight;

    // ============================================
    // 税金の計算セクション
    // ============================================

    const taxY = Math.min(leftY, rightY) - 15;

    // 税金の計算ヘッダー
    drawCell(page, leftMargin, taxY - 25, contentWidth, 25, { fillColor: redBg });
    page.drawText('税金の計算', {
        x: leftMargin + contentWidth / 2 - 30,
        y: taxY - 18,
        size: 11,
        font: jpFontBold,
        color: black,
    });

    let calcY = taxY - 25;

    // 税金計算項目
    const taxItems = [
        { label: '㉖', name: '課税される所得金額', value: data.taxableIncome },
        { label: '㉗', name: '上の㉖に対する税額', value: data.incomeTax },
        { label: '㊱', name: '復興特別所得税額', value: data.reconstructionTax },
    ];

    for (const item of taxItems) {
        drawCell(page, leftMargin, calcY - rowHeight, 25, rowHeight, { fillColor: headerBg });
        drawCell(page, leftMargin + 25, calcY - rowHeight, contentWidth - 125, rowHeight);
        drawCell(page, leftMargin + contentWidth - 100, calcY - rowHeight, 100, rowHeight);

        page.drawText(item.label, {
            x: leftMargin + 6,
            y: calcY - 15,
            size: 8,
            font: jpFont,
            color: black,
        });
        page.drawText(item.name, {
            x: leftMargin + 30,
            y: calcY - 15,
            size: 9,
            font: jpFont,
            color: black,
        });
        drawRightAlignedText(page, formatAmount(item.value), leftMargin + contentWidth - 5, calcY - 15, font, 10);
        calcY -= rowHeight;
    }

    // 所得税及び復興特別所得税の額（合計）
    drawCell(page, leftMargin, calcY - rowHeight - 3, 25, rowHeight + 3, { fillColor: headerBg });
    drawCell(page, leftMargin + 25, calcY - rowHeight - 3, contentWidth - 125, rowHeight + 3, { fillColor: rgb(1, 0.95, 0.85) });
    drawCell(page, leftMargin + contentWidth - 100, calcY - rowHeight - 3, 100, rowHeight + 3, { fillColor: rgb(1, 0.95, 0.85) });

    page.drawText('㊲', {
        x: leftMargin + 6,
        y: calcY - 15,
        size: 8,
        font: jpFont,
        color: black,
    });
    page.drawText('所得税及び復興特別所得税の額', {
        x: leftMargin + 30,
        y: calcY - 15,
        size: 9,
        font: jpFontBold,
        color: black,
    });
    drawRightAlignedText(page, formatAmount(data.totalTax), leftMargin + contentWidth - 5, calcY - 15, fontBold, 11);
    calcY -= rowHeight + 3;

    // 源泉徴収税額
    drawCell(page, leftMargin, calcY - rowHeight, 25, rowHeight, { fillColor: headerBg });
    drawCell(page, leftMargin + 25, calcY - rowHeight, contentWidth - 125, rowHeight);
    drawCell(page, leftMargin + contentWidth - 100, calcY - rowHeight, 100, rowHeight);

    page.drawText('㊹', {
        x: leftMargin + 6,
        y: calcY - 15,
        size: 8,
        font: jpFont,
        color: black,
    });
    page.drawText('源泉徴収税額', {
        x: leftMargin + 30,
        y: calcY - 15,
        size: 9,
        font: jpFont,
        color: black,
    });
    drawRightAlignedText(page, formatAmount(data.withholdingTax || 0), leftMargin + contentWidth - 5, calcY - 15, font, 10);
    calcY -= rowHeight;

    // ============================================
    // 納付/還付セクション
    // ============================================

    calcY -= 10;
    const finalY = calcY;
    const halfWidth = contentWidth / 2 - 5;

    // 納付額
    const taxDue = data.finalTaxDue ?? data.totalTax;
    drawCell(page, leftMargin, finalY - 50, halfWidth, 50, { fillColor: blueBg });
    page.drawText('㊺ 申告納税額', {
        x: leftMargin + 10,
        y: finalY - 20,
        size: 10,
        font: jpFontBold,
        color: black,
    });
    if (taxDue > 0) {
        page.drawText(`¥${formatAmount(taxDue)}`, {
            x: leftMargin + halfWidth / 2 - 30,
            y: finalY - 40,
            size: 16,
            font: fontBold,
            color: blue,
        });
    } else {
        page.drawText('-', {
            x: leftMargin + halfWidth / 2,
            y: finalY - 40,
            size: 14,
            font: font,
            color: darkGray,
        });
    }

    // 還付額
    drawCell(page, leftMargin + halfWidth + 10, finalY - 50, halfWidth, 50, { fillColor: redBg });
    page.drawText('㊻ 還付される税金', {
        x: leftMargin + halfWidth + 20,
        y: finalY - 20,
        size: 10,
        font: jpFontBold,
        color: black,
    });
    if (taxDue < 0) {
        page.drawText(`¥${formatAmount(Math.abs(taxDue))}`, {
            x: leftMargin + halfWidth + halfWidth / 2 - 20,
            y: finalY - 40,
            size: 16,
            font: fontBold,
            color: rgb(0.8, 0.2, 0.2),
        });
    } else {
        page.drawText('-', {
            x: leftMargin + halfWidth + halfWidth / 2,
            y: finalY - 40,
            size: 14,
            font: font,
            color: darkGray,
        });
    }

    // ============================================
    // 経費内訳セクション（2ページ目）
    // ============================================

    const page2 = pdfDoc.addPage([595.28, 841.89]);
    let page2Y = height - 40;

    // 経費内訳ヘッダー
    drawCell(page2, leftMargin, page2Y - 30, contentWidth, 30, { fillColor: headerBg });
    page2.drawText('収支内訳書（必要経費の内訳）', {
        x: leftMargin + contentWidth / 2 - 80,
        y: page2Y - 22,
        size: 14,
        font: jpFontBold,
        color: black,
    });
    page2Y -= 40;

    // 経費テーブルヘッダー
    drawCell(page2, leftMargin, page2Y - 25, contentWidth - 100, 25, { fillColor: blueBg });
    drawCell(page2, leftMargin + contentWidth - 100, page2Y - 25, 100, 25, { fillColor: blueBg });

    page2.drawText('科目', {
        x: leftMargin + 10,
        y: page2Y - 18,
        size: 10,
        font: jpFontBold,
        color: black,
    });
    page2.drawText('金額', {
        x: leftMargin + contentWidth - 60,
        y: page2Y - 18,
        size: 10,
        font: jpFontBold,
        color: black,
    });
    page2Y -= 25;

    // 経費項目
    let expenseIndex = 0;
    for (const cat of EXPENSE_CATEGORIES) {
        const amount = data.expenses[cat.id];
        if (amount && amount > 0) {
            const bgColor = expenseIndex % 2 === 0 ? undefined : rgb(0.97, 0.97, 0.97);
            drawCell(page2, leftMargin, page2Y - rowHeight, contentWidth - 100, rowHeight, { fillColor: bgColor });
            drawCell(page2, leftMargin + contentWidth - 100, page2Y - rowHeight, 100, rowHeight, { fillColor: bgColor });

            page2.drawText(cat.nameJa, {
                x: leftMargin + 10,
                y: page2Y - 15,
                size: 10,
                font: jpFont,
                color: black,
            });
            drawRightAlignedText(page2, `¥${formatAmount(amount)}`, leftMargin + contentWidth - 10, page2Y - 15, font, 10);

            page2Y -= rowHeight;
            expenseIndex++;
        }
    }

    // 経費合計
    drawCell(page2, leftMargin, page2Y - rowHeight - 2, contentWidth - 100, rowHeight + 2, { fillColor: yellowBg });
    drawCell(page2, leftMargin + contentWidth - 100, page2Y - rowHeight - 2, 100, rowHeight + 2, { fillColor: yellowBg });

    page2.drawText('必要経費合計', {
        x: leftMargin + 10,
        y: page2Y - 15,
        size: 11,
        font: jpFontBold,
        color: black,
    });
    drawRightAlignedText(page2, `¥${formatAmount(data.totalExpenses)}`, leftMargin + contentWidth - 10, page2Y - 15, fontBold, 11);

    // ============================================
    // フッター
    // ============================================

    // 1ページ目フッター
    page.drawText('※ この書類はSwipeTaxで作成した参考資料です。正式な申告はe-Taxをご利用ください。', {
        x: leftMargin,
        y: 50,
        size: 8,
        font: jpFont,
        color: darkGray,
    });

    page.drawText(`作成日: ${new Date().toLocaleDateString('ja-JP')}`, {
        x: leftMargin,
        y: 35,
        size: 8,
        font: jpFont,
        color: darkGray,
    });

    // 2ページ目フッター
    page2.drawText('※ この書類はSwipeTaxで作成した参考資料です。正式な申告はe-Taxをご利用ください。', {
        x: leftMargin,
        y: 50,
        size: 8,
        font: jpFont,
        color: darkGray,
    });

    return pdfDoc.save();
}
