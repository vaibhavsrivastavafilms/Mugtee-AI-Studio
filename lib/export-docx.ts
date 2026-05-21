// MUGTEE DOCX Export — dependency-free.
//
// Word and Pages both happily render HTML saved as a .doc file with the right MIME.
// This lets us ship a "Word document" with preserved headings + paragraphs without
// pulling in the 100KB `docx` npm package or any other heavy library.
//
// Filename pattern: mugtee-script-{slug}.doc

export function exportScriptAsDoc(args: {
  title: string
  body: string
  isUnlimited?: boolean   // when false (free tier) we append a tasteful watermark
}) {
  const { title, body, isUnlimited } = args
  const safeTitle = (title || 'mugtee-script').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase().slice(0, 60)
  const filename = `mugtee-script-${safeTitle}.doc`

  // Preserve paragraphs by converting double-newline blocks into <p>, single newlines into <br>.
  const escape = (s: string) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

  const bodyHtml = String(body || '')
    .trim()
    .split(/\n\s*\n+/)
    .map(block => `<p>${escape(block).replace(/\n/g, '<br/>')}</p>`) 
    .join('\n')

  const watermarkHtml = isUnlimited
    ? ''
    : `<hr/><p style="font-family:Georgia,serif;font-size:11pt;color:#5a4a1f;text-align:center;">Made with Mugtee · AI Production OS for creators · https://mugtee.in</p>`

  const html = `<!DOCTYPE html><html xmlns:office="urn:schemas-microsoft-com:office:office" xmlns:word="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8"/>
<title>${escape(title)}</title>
<!--[if gte mso 9]><xml><word:WordDocument><word:View>Print</word:View><word:Zoom>100</word:Zoom></word:WordDocument></xml><![endif]-->
<style>
  body { font-family: Georgia, "Times New Roman", serif; font-size: 12pt; color: #111; line-height: 1.55; }
  h1   { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 22pt; color: #1a1208; border-bottom: 1pt solid #d4af37; padding-bottom: 6pt; margin: 0 0 14pt 0; }
  p    { margin: 0 0 11pt 0; }
  hr   { border: 0; border-top: 1pt solid #d4af37; margin: 18pt 0 12pt 0; }
</style>
</head>
<body>
  <h1>${escape(title)}</h1>
  ${bodyHtml}
  ${watermarkHtml}
</body>
</html>`

  // Use the official Word MIME so OSes default-open to Word / Pages / Google Docs.
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
