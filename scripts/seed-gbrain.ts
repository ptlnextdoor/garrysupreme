import 'dotenv/config'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = join(import.meta.dirname ?? __dirname, '..')
const DATA_DIR = join(ROOT, 'data')
const GBRAIN_BASE_URL = process.env.GBRAIN_BASE_URL
const GBRAIN_API_KEY = process.env.GBRAIN_API_KEY
const GBRAIN_PROJECT_ID = process.env.GBRAIN_PROJECT_ID

if (!GBRAIN_BASE_URL || !GBRAIN_API_KEY || !GBRAIN_PROJECT_ID) {
  console.error('❌ Missing GBrain env vars. Copy .env.example → .env and fill them in.')
  process.exit(1)
}

function walkDir(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...walkDir(full))
    } else if (entry.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

async function uploadFile(filePath: string): Promise<void> {
  const content = readFileSync(filePath, 'utf8')
  const relPath = relative(ROOT, filePath)

  // Extract YAML frontmatter key: value pairs for metadata
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const meta: Record<string, string> = {}
  if (frontmatterMatch) {
    for (const line of frontmatterMatch[1].split('\n')) {
      const [k, ...rest] = line.split(':')
      if (k && rest.length) meta[k.trim()] = rest.join(':').trim().replace(/^"|"$/g, '')
    }
  }

  const res = await fetch(`${GBRAIN_BASE_URL}/v1/projects/${GBRAIN_PROJECT_ID}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GBRAIN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: relPath,
      content,
      metadata: meta,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Upload failed for ${relPath}: ${res.status} ${body}`)
  }

  console.log(`✅ uploaded: ${relPath}`)
}

async function main() {
  const files = walkDir(DATA_DIR)
  console.log(`\nFound ${files.length} seed files in data/\n`)

  // Validate all files parse first before uploading
  for (const f of files) {
    try {
      readFileSync(f, 'utf8')
    } catch (err) {
      console.error(`❌ Cannot read ${f}:`, err)
      process.exit(1)
    }
  }

  console.log('All files readable. Uploading to GBrain...\n')

  for (const f of files) {
    try {
      await uploadFile(f)
    } catch (err) {
      console.error(`❌ ${err}`)
    }
  }

  console.log('\nSeed complete.')
}

main()
