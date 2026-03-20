import { promises as fs } from 'node:fs'

export interface SuccessSummaryInput {
  service: string
  version: string
  installShUrl?: string
  versionUrls: string[]
  latestUrls: string[]
  manifestUrl: string
  checksumsUrl?: string
}

export interface FailureSummaryInput {
  service: string
  version: string
  failedPhase: string
  uploadedUrls: string[]
}

function renderUrlList(urls: string[]): string {
  if (urls.length === 0) {
    return '- 无\n'
  }

  return urls.map((url) => `- ${url}\n`).join('')
}

export function createSuccessSummary(input: SuccessSummaryInput): string {
  let markdown = `## 又拍云发布成功

- 服务：${input.service}
- 版本：${input.version}

### 下载地址
`

  if (input.installShUrl) {
    markdown += `- install.sh: ${input.installShUrl}\n`
  }

  markdown += '\n### Version 地址\n'
  markdown += renderUrlList(input.versionUrls)
  markdown += '\n### Latest 地址\n'
  markdown += renderUrlList(input.latestUrls)
  markdown += '\n### 附加文件\n'
  markdown += `- manifest: ${input.manifestUrl}\n`

  if (input.checksumsUrl) {
    markdown += `- checksums: ${input.checksumsUrl}\n`
  }

  return markdown
}

export function createFailureSummary(input: FailureSummaryInput): string {
  return `## 又拍云发布失败

- 服务：${input.service}
- 版本：${input.version}
- 失败阶段：${input.failedPhase}

### 已上传地址
${renderUrlList(input.uploadedUrls)}`
}

export async function writeJobSummary(
  markdown: string,
  writeFile: typeof fs.writeFile = fs.writeFile,
  summaryPath = process.env.GITHUB_STEP_SUMMARY
): Promise<void> {
  if (!summaryPath) {
    return
  }

  await writeFile(summaryPath, markdown, 'utf8')
}
