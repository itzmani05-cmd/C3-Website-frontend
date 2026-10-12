// Styles for the exported .doc: Word ignores the app's Tailwind classes, so the paper's
// semantic class names (doc-title, doc-question-card, ...) are styled here instead.
const WORD_STYLES = `
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.5; color: #000000; margin: 1in; }
  h1, h2, h3, h4 { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; }
  .document-header { text-align: center; margin-bottom: 24px; border-bottom: 3px double #000000; padding-bottom: 12px; }
  .doc-title { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; }
  .doc-subtitle { font-size: 11pt; font-style: italic; margin-bottom: 12px; }
  .curriculum-header { font-size: 10pt; font-weight: bold; margin-bottom: 12px; }
  .part-header { font-size: 13pt; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000000; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px; }
  .section-header { font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #4b5563; margin-bottom: 10px; }
  .doc-instructions { text-align: left; border: 1px solid #000000; padding: 10px; margin-top: 12px; margin-bottom: 20px; }
  .doc-instructions ul { margin-top: 4px; margin-left: 20px; padding-left: 0; }
  .questions-grid { display: table; width: 100%; }
  .doc-question-card { margin-bottom: 18px; page-break-inside: avoid; }
  .doc-question-header { margin-bottom: 6px; }
  .question-number { font-weight: bold; margin-right: 6px; }
  .question-text { font-weight: normal; }
  .doc-options-grid { margin-left: 24px; margin-bottom: 12px; }
  .doc-option-item { margin-bottom: 4px; }
  .option-label { font-weight: bold; margin-right: 6px; }
  .doc-inline-answer { margin-top: 8px; margin-left: 24px; border-left: 3px solid #059669; padding-left: 10px; color: #059669; }
  .answer-badge { font-weight: bold; }
  .explanation-text-box { color: #4b5563; font-size: 10pt; }
  .document-answer-key { margin-top: 30px; border-top: 2px solid #000000; padding-top: 15px; page-break-before: always; }
  .section-title { font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 12px; }
  .compact-key-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  .compact-key-table td { border: 1px solid #000000; padding: 6px; text-align: center; }
  .document-explanations-key { margin-top: 30px; border-top: 2px solid #000000; padding-top: 15px; page-break-before: always; }
  .explanation-detail-item { border-bottom: 1px dashed #cccccc; padding-bottom: 12px; margin-bottom: 16px; page-break-inside: avoid; }
  .matching-columns-table { width: 100%; border-collapse: collapse; border: none; margin-top: 8px; margin-bottom: 12px; }
  .matching-columns-table td { border: none; padding: 4px 12px 4px 0; vertical-align: top; width: 50%; }
  .matching-column-header-inline { font-weight: bold; text-decoration: underline; margin-bottom: 6px; }
  .ar-container-inline { margin-left: 26px; margin-top: 6px; margin-bottom: 12px; }
  .ar-line-item { margin: 4px 0; font-weight: 500; line-height: 1.45; }
`;

const WORD_BODY_SIZE = { small: '10pt', medium: '11pt', large: '12.5pt' } as const;

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Downloads the HTML of `element` as a Word (.doc) file named after `title`. */
export function exportElementToWord(element: Element, title: string, fontSize: keyof typeof WORD_BODY_SIZE = 'medium') {
  const source = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>${escapeHtml(title)}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>${WORD_STYLES} body { font-size: ${WORD_BODY_SIZE[fontSize]}; }</style>
    </head>
    <body>${element.innerHTML}</body></html>`;

  const blob = new Blob(['﻿' + source], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_assessment.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
