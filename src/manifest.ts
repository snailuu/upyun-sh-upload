import { createHash } from 'node:crypto'
import type { ReleaseFileTarget } from './config.js'

export interface ManifestEntry {
  fileName: string
  size: number
  sha256: string
  versionUrl: string
  latestUrl: string
}

export interface ReleaseManifest {
  service: string
  version: string
  generatedAt: string
  files: ManifestEntry[]
}

export function createSha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex')
}

export function buildManifestEntries(
  fileTargets: ReleaseFileTarget[],
  fileContents: Record<string, Buffer | string>
): ManifestEntry[] {
  return fileTargets.map((target) => {
    const content = fileContents[target.sourcePath]

    if (content === undefined) {
      throw new Error(`缺少文件内容：${target.sourcePath}`)
    }

    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content)

    return {
      fileName: target.fileName,
      size: buffer.byteLength,
      sha256: createSha256(buffer),
      versionUrl: target.versionUrl,
      latestUrl: target.latestUrl
    }
  })
}

export function buildReleaseManifest(input: ReleaseManifest): ReleaseManifest {
  return input
}

export function renderChecksums(files: ManifestEntry[]): string {
  return files.map((file) => `${file.sha256}  ${file.fileName}\n`).join('')
}
