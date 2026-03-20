const { buildReleaseTargetConfig } = await import('../src/config.js')
const {
  buildManifestEntries,
  buildReleaseManifest,
  createSha256,
  renderChecksums
} = await import('../src/manifest.js')

describe('manifest.ts', () => {
  it('生成 manifest.json 结构与 sha256', () => {
    const config = buildReleaseTargetConfig({
      service: 'snailsync',
      version: 'v1.2.3',
      files: ['dist/snailsync-linux-amd64.tar.gz', './install.sh'],
      bucket: 'download',
      operator: 'robot',
      password: 'secret',
      cdnBaseUrl: 'https://download.example.com',
      latest: true,
      uploadInstallSh: true,
      generateChecksums: true,
      overwrite: false
    })

    const entries = buildManifestEntries(config.files, {
      'dist/snailsync-linux-amd64.tar.gz': Buffer.from('linux-binary'),
      './install.sh': Buffer.from('#!/bin/sh\necho install\n')
    })
    const manifest = buildReleaseManifest({
      service: 'snailsync',
      version: 'v1.2.3',
      generatedAt: '2026-03-20T08:00:00.000Z',
      files: entries
    })

    expect(manifest).toEqual({
      service: 'snailsync',
      version: 'v1.2.3',
      generatedAt: '2026-03-20T08:00:00.000Z',
      files: [
        {
          fileName: 'snailsync-linux-amd64.tar.gz',
          size: 12,
          sha256: createSha256(Buffer.from('linux-binary')),
          versionUrl:
            'https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz',
          latestUrl:
            'https://download.example.com/snailsync/latest/snailsync-linux-amd64.tar.gz'
        },
        {
          fileName: 'install.sh',
          size: 23,
          sha256: createSha256(Buffer.from('#!/bin/sh\necho install\n')),
          versionUrl:
            'https://download.example.com/snailsync/v1.2.3/install.sh',
          latestUrl: 'https://download.example.com/snailsync/latest/install.sh'
        }
      ]
    })
  })

  it('生成 checksums.txt 文本', () => {
    const checksums = renderChecksums([
      {
        fileName: 'snailsync-linux-amd64.tar.gz',
        sha256: 'aaaabbbb'
      },
      {
        fileName: 'install.sh',
        sha256: 'ccccdddd'
      }
    ])

    expect(checksums).toBe(
      'aaaabbbb  snailsync-linux-amd64.tar.gz\nccccdddd  install.sh\n'
    )
  })
})
