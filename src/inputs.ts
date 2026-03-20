import * as core from '@actions/core'
import { ActionInputError } from './errors.js'

type InputGetter = (name: string) => string

export interface ActionInputs {
  service: string
  version: string
  files: string[]
  bucket: string
  operator: string
  password: string
  cdnBaseUrl: string
  latest: boolean
  uploadInstallSh: boolean
  generateChecksums: boolean
  overwrite: boolean
}

function readRequiredInput(
  getInput: InputGetter,
  name:
    | 'service'
    | 'version'
    | 'files'
    | 'bucket'
    | 'operator'
    | 'password'
    | 'cdn_base_url'
): string {
  const value = getInput(name).trim()

  if (!value) {
    throw new ActionInputError(`输入 ${name} 不能为空。`)
  }

  return value
}

function parseFilesInput(value: string): string[] {
  const files = value
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean)

  if (files.length === 0) {
    throw new ActionInputError('输入 files 至少需要包含一个文件路径。')
  }

  return files
}

function parseBooleanInput(
  getInput: InputGetter,
  name: string,
  defaultValue: boolean
): boolean {
  const rawValue = getInput(name).trim().toLowerCase()

  if (!rawValue) {
    return defaultValue
  }

  if (['true', '1', 'yes'].includes(rawValue)) {
    return true
  }

  if (['false', '0', 'no'].includes(rawValue)) {
    return false
  }

  throw new ActionInputError(`输入 ${name} 只能是 true/false、1/0、yes/no。`)
}

export function parseActionInputs(
  getInput: InputGetter = core.getInput
): ActionInputs {
  const service = readRequiredInput(getInput, 'service')
  const version = readRequiredInput(getInput, 'version')
  const files = parseFilesInput(getInput('files'))
  const bucket = readRequiredInput(getInput, 'bucket')
  const operator = readRequiredInput(getInput, 'operator')
  const password = readRequiredInput(getInput, 'password')
  const cdnBaseUrl = readRequiredInput(getInput, 'cdn_base_url')

  return {
    service,
    version,
    files,
    bucket,
    operator,
    password,
    cdnBaseUrl,
    latest: parseBooleanInput(getInput, 'latest', true),
    uploadInstallSh: parseBooleanInput(getInput, 'upload_install_sh', false),
    generateChecksums: parseBooleanInput(getInput, 'generate_checksums', true),
    overwrite: parseBooleanInput(getInput, 'overwrite', false)
  }
}
