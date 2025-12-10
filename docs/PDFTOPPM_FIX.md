# pdftoppm File Naming Fix

## Issue

PDF processing was failing with errors:
```
⚠ Image file not found: /tmp/pdf-ocr-xxx/page-001.png
```

## Root Cause

The code used hardcoded 3-digit padding for all PDFs:
```typescript
const paddedNum = String(pageNum).padStart(3, '0'); // Always 3 digits
const imageFile = `${outputPrefix}-${paddedNum}.png`;
```

However, `pdftoppm` varies its padding based on the **total number of pages**:
- 1-9 pages: `page-1.png` (1 digit)
- 10-99 pages: `page-01.png` (2 digits)
- 100-999 pages: `page-001.png` (3 digits)

## Fix

Changed padding to match `pdftoppm`'s behavior (lib/rag/document-processor.ts:85-87):

```typescript
// Dynamic padding based on total page count
const numDigits = String(numPages).length;
const paddedNum = String(pageNum).padStart(numDigits, '0');
const imageFile = `${outputPrefix}-${paddedNum}.png`;
```

**Examples:**
- 15-page PDF: `numPages = 15` → `numDigits = 2` → `page-01.png`
- 650-page PDF: `numPages = 650` → `numDigits = 3` → `page-001.png`

## Additional Improvements

Added debug logging to troubleshoot file naming issues:

```typescript
// Debug: List actual files created
const createdFiles = fs.readdirSync(tempDir);
console.log(`  ✓ Converted ${pagesToProcess} page(s) to images`);
console.log(`  📁 Files in ${tempDir}:`, createdFiles);
```

Enhanced error logging when files not found:

```typescript
if (!fs.existsSync(imageFile)) {
  console.log(`  ⚠ Image file not found: ${imageFile}`);
  console.log(`  📋 Expected: ${path.basename(imageFile)}, Available:`,
    createdFiles.filter(f => f.endsWith('.png')));
  continue;
}
```

## Verification

Successfully processed a 15-page PDF:
```
✓ PDF has 15 page(s), processing first 15
✓ Converted 15 page(s) to images
📁 Files in /tmp/pdf-ocr-J6rXlE: [
  'page-01.png', 'page-02.png', ...
]
📸 OCR processing page 1/15...
  ✓ Extracted 253 characters
...
✓ Extracted 34636 characters from 15 pages
✓ Generated 50 chunks
✓ Saved 50/50 chunks
```

## Status

✅ **Fixed** - Document processing now works with PDFs of any page count

**Current processing:**
- 2 documents completed (53 chunks total)
- 5 documents queued/processing
- 46 chunks embedded with Qwen3

---

**Fixed:** 2025-12-09
**File:** lib/rag/document-processor.ts
**Lines:** 85-92
