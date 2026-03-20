import path from 'node:path'
import type { ActionInputs } from './inputs.js'
import { ActionInputError } from './errors.js'

export interface ReleaseFileTarget {
  sourcePath: string
  fileName: string
  versionKey: string
  latestKey: string
  versionUrl: string
  latestUrl: string
}

export interface ReleaseTargetConfig {
  basePath: string
  versionPath: string
  latestPath: string
  manifestKey: string
  checksumsKey: string
  installShKey: string
  installShUrl: string
  files: ReleaseFileTarget[]
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+/u, '').replace(/\/+$/u, '')
}

export function normalizePathSegment(value: string, fieldName: string): string {
  const normalizedValue = trimSlashes(value.trim())

  if (!normalizedValue) {
    throw new ActionInputError(`输入 ${fieldName} 不能为空。`)
  }

  if (normalizedValue === '.' || normalizedValue === '..') {
    throw new ActionInputError(`输入 ${fieldName} 不能是 . 或 ..。`)
  }

  if (/[/\\]/u.test(normalizedValue)) {
    throw new ActionInputError(`输入 ${fieldName} 不能包含路径分隔符。`)
  }

  if (/[\r\n\t]/u.test(normalizedValue)) {
    throw new ActionInputError(`输入 ${fieldName} 不能包含控制字符。`)
  }

  return normalizedValue
}

export function normalizeBaseUrl(value: string): string {
  const parsedUrl = new URL(value.trim())

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new ActionInputError(
      '输入 cdn_base_url 只能使用 http 或 https 协议。'
    )
  }

  const normalizedPath = parsedUrl.pathname.replace(/\/+$/u, '')

  return `${parsedUrl.origin}${normalizedPath}`
}

function normalizeSourcePath(sourcePath: string): string {
  const trimmedPath = sourcePath.trim()

  if (!trimmedPath) {
    throw new ActionInputError('文件路径不能为空。')
  }

  if (/[\r\n\t]/u.test(trimmedPath)) {
    throw new ActionInputError('文件路径不能包含控制字符。')
  }

  const normalizedPath = trimmedPath.replace(/\\/gu, '/').replace(/^\/+/u, '')

  if (normalizedPath.endsWith('/')) {
    throw new ActionInputError('文件路径必须指向文件，不能以 / 结尾。')
  }

  return normalizedPath
}

function buildStorageKey(...segments: string[]): string {
  return segments.map((segment) => trimSlashes(segment)).join('/')
}

function buildPublicUrl(baseUrl: string, key: string): string {
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `${baseUrl}/${encodedKey}`
}

export function buildReleaseTargetConfig(
  inputs: ActionInputs
): ReleaseTargetConfig {
  const service = normalizePathSegment(inputs.service, 'service')
  const version = normalizePathSegment(inputs.version, 'version')
  const baseUrl = normalizeBaseUrl(inputs.cdnBaseUrl)
  const basePath = service
  const versionPath = buildStorageKey(service, version)
  const latestPath = buildStorageKey(service, 'latest')
  const installShKey = buildStorageKey(service, 'install.sh')
  const manifestKey = buildStorageKey(versionPath, 'manifest.json')
  const checksumsKey = buildStorageKey(versionPath, 'checksums.txt')

  const files = inputs.files.map((sourcePath) => {
    const normalizedSourcePath = normalizeSourcePath(sourcePath)
    const fileName = path.posix.basename(normalizedSourcePath)
    const versionKey = buildStorageKey(versionPath, fileName)
    const latestKey = buildStorageKey(latestPath, fileName)

    return {
      sourcePath,
      fileName,
      versionKey,
      latestKey,
      versionUrl: buildPublicUrl(baseUrl, versionKey),
      latestUrl: buildPublicUrl(baseUrl, latestKey)
    }
  })

  return {
    basePath,
    versionPath,
    latestPath,
    manifestKey,
    checksumsKey,
    installShKey,
    installShUrl: buildPublicUrl(baseUrl, installShKey),
    files
  }
}
