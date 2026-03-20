const { ActionInputError } = await import('../src/errors.js')
const { buildReleaseTargetConfig, normalizeBaseUrl, normalizePathSegment } =
  await import('../src/config.js')

describe('config.ts', () => {
  it('生成版本、latest 与附加文件路径', () => {
    const config = buildReleaseTargetConfig({
      service: 'snailsync',
      version: 'v1.2.3',
      files: [
        'dist/snailsync-linux-amd64.tar.gz',
        'artifacts\\snailsync-darwin-arm64.tar.gz',
        './install.sh'
      ],
      bucket: 'download',
      operator: 'robot',
      password: 'secret',
      cdnBaseUrl: 'https://download.example.com/releases/',
      latest: true,
      uploadInstallSh: true,
      generateChecksums: true,
      overwrite: false
    })

    expect(config.basePath).toBe('snailsync')
    expect(config.versionPath).toBe('snailsync/v1.2.3')
    expect(config.latestPath).toBe('snailsync/latest')
    expect(config.manifestKey).toBe('snailsync/v1.2.3/manifest.json')
    expect(config.manifestUrl).toBe(
      'https://download.example.com/releases/snailsync/v1.2.3/manifest.json'
    )
    expect(config.checksumsKey).toBe('snailsync/v1.2.3/checksums.txt')
    expect(config.checksumsUrl).toBe(
      'https://download.example.com/releases/snailsync/v1.2.3/checksums.txt'
    )
    expect(config.installShKey).toBe('snailsync/install.sh')
    expect(config.installShUrl).toBe(
      'https://download.example.com/releases/snailsync/install.sh'
    )
    expect(config.files).toEqual([
      {
        sourcePath: 'dist/snailsync-linux-amd64.tar.gz',
        fileName: 'snailsync-linux-amd64.tar.gz',
        versionKey: 'snailsync/v1.2.3/snailsync-linux-amd64.tar.gz',
        latestKey: 'snailsync/latest/snailsync-linux-amd64.tar.gz',
        versionUrl:
          'https://download.example.com/releases/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz',
        latestUrl:
          'https://download.example.com/releases/snailsync/latest/snailsync-linux-amd64.tar.gz'
      },
      {
        sourcePath: 'artifacts\\snailsync-darwin-arm64.tar.gz',
        fileName: 'snailsync-darwin-arm64.tar.gz',
        versionKey: 'snailsync/v1.2.3/snailsync-darwin-arm64.tar.gz',
        latestKey: 'snailsync/latest/snailsync-darwin-arm64.tar.gz',
        versionUrl:
          'https://download.example.com/releases/snailsync/v1.2.3/snailsync-darwin-arm64.tar.gz',
        latestUrl:
          'https://download.example.com/releases/snailsync/latest/snailsync-darwin-arm64.tar.gz'
      },
      {
        sourcePath: './install.sh',
        fileName: 'install.sh',
        versionKey: 'snailsync/v1.2.3/install.sh',
        latestKey: 'snailsync/latest/install.sh',
        versionUrl:
          'https://download.example.com/releases/snailsync/v1.2.3/install.sh',
        latestUrl:
          'https://download.example.com/releases/snailsync/latest/install.sh'
      }
    ])
  })

  it('归一化公开域名并去掉末尾斜杠', () => {
    expect(normalizeBaseUrl('https://download.example.com/releases///')).toBe(
      'https://download.example.com/releases'
    )
  })

  it('非法 service 段抛错', () => {
    expect(() => normalizePathSegment('release/core', 'service')).toThrow(
      new ActionInputError('输入 service 不能包含路径分隔符。')
    )
  })

  it('非法版本段抛错', () => {
    expect(() => normalizePathSegment('..', 'version')).toThrow(
      new ActionInputError('输入 version 不能是 . 或 ..。')
    )
  })

  it('非法域名协议抛错', () => {
    expect(() => normalizeBaseUrl('ftp://download.example.com')).toThrow(
      new ActionInputError('输入 cdn_base_url 只能使用 http 或 https 协议。')
    )
  })
})
