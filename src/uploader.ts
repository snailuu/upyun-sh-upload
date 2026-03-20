import type { ReleaseTargetConfig } from './config.js'
import { ActionInputError } from './errors.js'
import {
  buildManifestEntries,
  buildReleaseManifest,
  renderChecksums
} from './manifest.js'
import { createFailureSummary, createSuccessSummary } from './summary.js'
import type { ActionInputs } from './inputs.js'
import type { UpyunUploadItem } from './upyun-client.js'

type ReadFile = (filePath: string) => Promise<Buffer>

interface PrepareUploadPlanOptions {
  generatedAt?: string
}

interface PreparedUpload extends UpyunUploadItem {
  publicUrl: string
}

export interface PreparedUploadPlan {
  service: string
  version: string
  versionUploads: PreparedUpload[]
  latestUploads: PreparedUpload[]
  installShUpload?: PreparedUpload
  versionUrls: string[]
  latestUrls: string[]
  installShUrl?: string
  manifestUrl: string
  checksumsUrl?: string
}

export interface PublishReport {
  versionUrls: string[]
  latestUrls: string[]
  installShUrl?: string
  manifestUrl: string
  checksumsUrl?: string
  summaryMarkdown: string
}

export class UploadPhaseError extends Error {
  constructor(
    readonly phase: 'version' | 'latest' | 'install.sh',
    readonly uploadedUrls: string[],
    readonly summaryMarkdown: string,
    message: string
  ) {
    super(message)
    this.name = 'UploadPhaseError'
  }
}

function guessContentType(fileName: string): string {
  if (fileName.endsWith('.json')) return 'application/json'
  if (fileName.endsWith('.txt')) return 'text/plain; charset=utf-8'
  if (fileName.endsWith('.sh')) return 'text/x-shellscript'
  if (fileName.endsWith('.tar.gz') || fileName.endsWith('.gz')) {
    return 'application/gzip'
  }
  if (fileName.endsWith('.zip')) return 'application/zip'

  return 'application/octet-stream'
}

function toBuffer(content: string): Buffer {
  return Buffer.from(content, 'utf8')
}

export async function prepareUploadPlan(
  inputs: ActionInputs,
  config: ReleaseTargetConfig,
  readFile: ReadFile,
  options: PrepareUploadPlanOptions = {}
): Promise<PreparedUploadPlan> {
  const fileContents = Object.fromEntries(
    await Promise.all(
      config.files.map(async (file) => [
        file.sourcePath,
        await readFile(file.sourcePath)
      ])
    )
  ) as Record<string, Buffer>
  const manifestEntries = buildManifestEntries(config.files, fileContents)
  const manifest = buildReleaseManifest({
    service: inputs.service,
    version: inputs.version,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    files: manifestEntries
  })
  const manifestContent = toBuffer(`${JSON.stringify(manifest, null, 2)}\n`)
  const checksumsContent = toBuffer(renderChecksums(manifestEntries))

  const versionUploads: PreparedUpload[] = config.files.map((file) => ({
    key: file.versionKey,
    content: fileContents[file.sourcePath],
    contentType: guessContentType(file.fileName),
    overwrite: inputs.overwrite,
    publicUrl: file.versionUrl
  }))

  versionUploads.push({
    key: config.manifestKey,
    content: manifestContent,
    contentType: 'application/json',
    overwrite: inputs.overwrite,
    publicUrl: config.manifestUrl
  })

  let checksumsUrl: string | undefined
  if (inputs.generateChecksums) {
    checksumsUrl = config.checksumsUrl
    versionUploads.push({
      key: config.checksumsKey,
      content: checksumsContent,
      contentType: 'text/plain; charset=utf-8',
      overwrite: inputs.overwrite,
      publicUrl: config.checksumsUrl
    })
  }

  const latestUploads = inputs.latest
    ? config.files.map((file) => ({
        key: file.latestKey,
        content: fileContents[file.sourcePath],
        contentType: guessContentType(file.fileName),
        overwrite: true,
        publicUrl: file.latestUrl
      }))
    : []

  let installShUpload: PreparedUpload | undefined
  if (inputs.uploadInstallSh) {
    const installTarget = config.files.find(
      (file) => file.fileName === 'install.sh'
    )

    if (!installTarget) {
      throw new ActionInputError(
        '启用 upload_install_sh 时，files 中必须包含 install.sh。'
      )
    }

    installShUpload = {
      key: config.installShKey,
      content: fileContents[installTarget.sourcePath],
      contentType: guessContentType(installTarget.fileName),
      overwrite: true,
      publicUrl: config.installShUrl
    }
  }

  return {
    service: inputs.service,
    version: inputs.version,
    versionUploads,
    latestUploads,
    installShUpload,
    versionUrls: config.files.map((file) => file.versionUrl),
    latestUrls: config.files.map((file) => file.latestUrl),
    installShUrl: config.installShUrl,
    manifestUrl: config.manifestUrl,
    checksumsUrl
  }
}

async function uploadBatch(
  uploads: PreparedUpload[],
  upload: (item: PreparedUpload) => Promise<void>,
  uploadedUrls: string[]
): Promise<void> {
  for (const item of uploads) {
    await upload(item)
    uploadedUrls.push(item.publicUrl)
  }
}

export async function publishRelease(
  client: {
    upload: (item: PreparedUpload) => Promise<void>
  },
  plan: PreparedUploadPlan
): Promise<PublishReport> {
  const uploadedUrls: string[] = []

  try {
    await uploadBatch(plan.versionUploads, client.upload, uploadedUrls)
  } catch (error) {
    const summaryMarkdown = createFailureSummary({
      service: plan.service,
      version: plan.version,
      failedPhase: 'version',
      uploadedUrls
    })

    throw new UploadPhaseError(
      'version',
      uploadedUrls,
      summaryMarkdown,
      error instanceof Error ? error.message : 'version 上传失败'
    )
  }

  try {
    await uploadBatch(plan.latestUploads, client.upload, uploadedUrls)
  } catch (error) {
    const summaryMarkdown = createFailureSummary({
      service: plan.service,
      version: plan.version,
      failedPhase: 'latest',
      uploadedUrls
    })

    throw new UploadPhaseError(
      'latest',
      uploadedUrls,
      summaryMarkdown,
      error instanceof Error ? error.message : 'latest 上传失败'
    )
  }

  if (plan.installShUpload) {
    try {
      await client.upload(plan.installShUpload)
      uploadedUrls.push(plan.installShUpload.publicUrl)
    } catch (error) {
      const summaryMarkdown = createFailureSummary({
        service: plan.service,
        version: plan.version,
        failedPhase: 'install.sh',
        uploadedUrls
      })

      throw new UploadPhaseError(
        'install.sh',
        uploadedUrls,
        summaryMarkdown,
        error instanceof Error ? error.message : 'install.sh 上传失败'
      )
    }
  }

  return {
    versionUrls: plan.versionUrls,
    latestUrls: plan.latestUploads.length > 0 ? plan.latestUrls : [],
    installShUrl: plan.installShUpload ? plan.installShUrl : undefined,
    manifestUrl: plan.manifestUrl,
    checksumsUrl: plan.checksumsUrl,
    summaryMarkdown: createSuccessSummary({
      service: plan.service,
      version: plan.version,
      installShUrl: plan.installShUpload ? plan.installShUrl : undefined,
      versionUrls: plan.versionUrls,
      latestUrls: plan.latestUploads.length > 0 ? plan.latestUrls : [],
      manifestUrl: plan.manifestUrl,
      checksumsUrl: plan.checksumsUrl
    })
  }
}
