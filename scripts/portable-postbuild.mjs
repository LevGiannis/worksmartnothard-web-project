import fs from 'node:fs/promises'
import path from 'node:path'

const outDir = process.argv[2] || 'portable'
const indexPath = path.join(process.cwd(), outDir, 'index.html')

function replaceAll(html) {
  // Remove attributes that trigger CORS checks under file://
  html = html.replace(/\s+crossorigin(=\"\"|=\"anonymous\")?/g, '')

  // Remove modulepreload links (not needed for classic script)
  html = html.replace(/\n\s*<link[^>]+rel=\"modulepreload\"[^>]*>\s*/g, '\n')

  // Convert module script to classic deferred script
  html = html.replace(
    /<script\s+type=\"module\"([^>]*?)src=\"([^\"]+)\"([^>]*)><\/script>/g,
    (_m, pre, src, post) => {
      const attrs = `${pre} ${post}`.replace(/\s+/g, ' ').trim()
      const cleaned = attrs
        .replace(/\btype=\"module\"/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      return `<script defer ${cleaned} src="${src}"></script>`
    }
  )

  return html
}

async function main() {
  let html
  try {
    html = await fs.readFile(indexPath, 'utf-8')
  } catch (e) {
    console.error(`[portable-postbuild] Cannot read ${indexPath}`)
    console.error(e)
    process.exit(1)
  }

  const next = replaceAll(html)
  await fs.writeFile(indexPath, next, 'utf-8')
  console.log(`[portable-postbuild] Patched ${outDir}/index.html for file://`)
}

main().catch((e) => {
  console.error('[portable-postbuild] Failed')
  console.error(e)
  process.exit(1)
})
