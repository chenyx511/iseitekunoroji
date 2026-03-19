import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const contentFile = path.join(rootDir, 'cms.content.json')
const publicDir = path.join(rootDir, 'public')
const siteUrl = process.env.SITE_URL || 'https://example.com'

function buildUrl(loc) {
  return `  <url>\n    <loc>${siteUrl}${loc}</loc>\n  </url>`
}

async function main() {
  const raw = await fs.readFile(contentFile, 'utf8')
  const content = JSON.parse(raw)
  const jaCases = content.ja?.casesSection?.items || []
  const zhCases = content.zh?.casesSection?.items || []
  const enCases = content.en?.casesSection?.items || []

  const urls = ['/', '/zh', '/en']
  for (const item of jaCases) {
    urls.push(`/cases/${item.slug}`)
  }
  for (const item of zhCases) {
    urls.push(`/zh/cases/${item.slug}`)
  }
  for (const item of enCases) {
    urls.push(`/en/cases/${item.slug}`)
  }

  const body = urls.map(buildUrl).join('\n')
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    '</urlset>',
    '',
  ].join('\n')

  const robots = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')

  await fs.mkdir(publicDir, { recursive: true })
  await fs.writeFile(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf8')
  await fs.writeFile(path.join(publicDir, 'robots.txt'), robots, 'utf8')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
