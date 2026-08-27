import fitz
from pathlib import Path

pdf_path = Path('attached_assets/3789240.3829164_1787813459535.pdf')
out_dir = Path('.agents/outputs/uploaded_pdf')
out_dir.mkdir(parents=True, exist_ok=True)

doc = fitz.open(pdf_path)
print('pages:', doc.page_count)
print('metadata:', doc.metadata)
for index, page in enumerate(doc):
    text = page.get_text('text').replace('\n', ' ')
    print(f'PAGE {index + 1}: {text[:500]}')
    if index < 5 or index in {9, 14, 19}:
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        pix.save(out_dir / f'page-{index + 1}.png')
