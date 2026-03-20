import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  const inputs = {
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
  }

  const config = {
    basePath: 'snailsync',
    versionPath: 'snailsync/v1.2.3',
    latestPath: 'snailsync/latest',
    manifestKey: 'snailsync/v1.2.3/manifest.json',
    checksumsKey: 'snailsync/v1.2.3/checksums.txt',
    installShKey: 'snailsync/install.sh',
    installShUrl: 'https://download.example.com/snailsync/install.sh',
    files: [
      {
        sourcePath: 'dist/snailsync-linux-amd64.tar.gz',
        fileName: 'snailsync-linux-amd64.tar.gz',
        versionKey: 'snailsync/v1.2.3/snailsync-linux-amd64.tar.gz',
        latestKey: 'snailsync/latest/snailsync-linux-amd64.tar.gz',
        versionUrl:
          'https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz',
        latestUrl:
          'https://download.example.com/snailsync/latest/snailsync-linux-amd64.tar.gz'
      }
    ]
  }

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('成功时写出 outputs 与 summary', async () => {
    const writeSummary = jest.fn(async () => {})

    await run({
      parseActionInputs: () => inputs,
      buildReleaseTargetConfig: () => config,
      createUpyunClient: () => ({ upload: jest.fn(async () => {}) }),
      prepareUploadPlan: jest.fn(async () => ({
        service: 'snailsync',
        version: 'v1.2.3',
        versionUploads: [],
        latestUploads: [],
        installShUpload: undefined,
        versionUrls: [
          'https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz'
        ],
        latestUrls: [
          'https://download.example.com/snailsync/latest/snailsync-linux-amd64.tar.gz'
        ],
        installShUrl: 'https://download.example.com/snailsync/install.sh',
        manifestUrl:
          'https://download.example.com/snailsync/v1.2.3/manifest.json'
      })),
      publishRelease: jest.fn(async () => ({
        versionUrls: [
          'https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz'
        ],
        latestUrls: [
          'https://download.example.com/snailsync/latest/snailsync-linux-amd64.tar.gz'
        ],
        installShUrl: 'https://download.example.com/snailsync/install.sh',
        manifestUrl:
          'https://download.example.com/snailsync/v1.2.3/manifest.json',
        summaryMarkdown: '## 又拍云发布成功'
      })),
      writeJobSummary: writeSummary
    })

    expect(core.setOutput).toHaveBeenCalledWith(
      'version_urls',
      'https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz'
    )
    expect(core.setOutput).toHaveBeenCalledWith(
      'latest_urls',
      'https://download.example.com/snailsync/latest/snailsync-linux-amd64.tar.gz'
    )
    expect(core.setOutput).toHaveBeenCalledWith(
      'install_sh_url',
      'https://download.example.com/snailsync/install.sh'
    )
    expect(core.setOutput).toHaveBeenCalledWith(
      'manifest_url',
      'https://download.example.com/snailsync/v1.2.3/manifest.json'
    )
    expect(writeSummary).toHaveBeenCalledWith('## 又拍云发布成功')
  })

  it('失败时设置失败状态并写入失败摘要', async () => {
    const writeSummary = jest.fn(async () => {})

    await run({
      parseActionInputs: () => inputs,
      buildReleaseTargetConfig: () => config,
      createUpyunClient: () => ({ upload: jest.fn(async () => {}) }),
      prepareUploadPlan: jest.fn(async () => ({
        service: 'snailsync',
        version: 'v1.2.3',
        versionUploads: [],
        latestUploads: [],
        installShUpload: undefined,
        versionUrls: [],
        latestUrls: [],
        installShUrl: undefined,
        manifestUrl:
          'https://download.example.com/snailsync/v1.2.3/manifest.json'
      })),
      publishRelease: jest.fn(async () => {
        throw {
          message: 'latest failed',
          summaryMarkdown: '## 又拍云发布失败'
        }
      }),
      writeJobSummary: writeSummary
    })

    expect(core.setFailed).toHaveBeenCalledWith('latest failed')
    expect(writeSummary).toHaveBeenCalledWith('## 又拍云发布失败')
  })
})
