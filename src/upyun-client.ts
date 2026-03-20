import { createHash } from 'node:crypto'

export interface UpyunUploadItem {
  key: string
  content: Buffer
  contentType: string
  overwrite: boolean
  publicUrl?: string
}

interface UpyunClientOptions {
  bucket: string
  operator: string
  password: string
  endpoint?: string
  fetchImpl?: typeof fetch
}

function createMd5(content: Buffer | string): string {
  return createHash('md5').update(content).digest('hex')
}

function createAuthorization(
  method: 'PUT' | 'HEAD',
  uri: string,
  date: string,
  contentMd5: string,
  operator: string,
  password: string
): string {
  const passwordMd5 = createMd5(password)
  const signature = createMd5(
    `${method}&${uri}&${date}&${contentMd5}&${passwordMd5}`
  )

  return `UPYUN ${operator}:${signature}`
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      code?: string
      msg?: string
      message?: string
    }

    return payload.msg ?? payload.message ?? payload.code ?? response.statusText
  } catch {
    return response.statusText
  }
}

export function createUpyunClient(options: UpyunClientOptions) {
  const endpoint = options.endpoint ?? 'https://v0.api.upyun.com'
  const fetchImpl = options.fetchImpl ?? fetch

  async function exists(key: string): Promise<boolean> {
    const uri = `/${options.bucket}/${key}`
    const date = new Date().toUTCString()
    const response = await fetchImpl(`${endpoint}${uri}`, {
      method: 'HEAD',
      headers: {
        Date: date,
        Authorization: createAuthorization(
          'HEAD',
          uri,
          date,
          '',
          options.operator,
          options.password
        )
      }
    })

    if (response.status === 404) {
      return false
    }

    if (!response.ok) {
      throw new Error(await parseError(response))
    }

    return true
  }

  async function upload(item: UpyunUploadItem): Promise<void> {
    if (!item.overwrite && (await exists(item.key))) {
      throw new Error(`远程文件已存在：${item.key}`)
    }

    const uri = `/${options.bucket}/${item.key}`
    const date = new Date().toUTCString()
    const contentMd5 = createMd5(item.content)
    const response = await fetchImpl(`${endpoint}${uri}`, {
      method: 'PUT',
      headers: {
        Authorization: createAuthorization(
          'PUT',
          uri,
          date,
          contentMd5,
          options.operator,
          options.password
        ),
        Date: date,
        'Content-MD5': contentMd5,
        'Content-Length': String(item.content.byteLength),
        'Content-Type': item.contentType
      },
      body: item.content
    })

    if (!response.ok) {
      throw new Error(await parseError(response))
    }
  }

  return {
    exists,
    upload
  }
}
