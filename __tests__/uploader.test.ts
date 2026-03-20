import { jest } from '@jest/globals'
import { buildReleaseTargetConfig } from '../src/config.js'
import { ActionInputError } from '../src/errors.js'
import {
  UploadPhaseError,
  prepareUploadPlan,
  publishRelease
} from '../src/uploader.js'

describe('uploader.ts', () => {
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

  it('按 version -> latest -> install.sh 顺序上传', async () => {
    const config = buildReleaseTargetConfig(inputs)
    const readFile = jest.fn(async (filePath: string) => {
      if (filePath === 'dist/snailsync-linux-amd64.tar.gz') {
        return Buffer.from('linux-binary')
      }

      return Buffer.from('#!/bin/sh\necho install\n')
    })
    const plan = await prepareUploadPlan(inputs, config, readFile, {
      generatedAt: '2026-03-20T08:00:00.000Z'
    })
    const upload = jest.fn(async () => {})

    const report = await publishRelease(
      {
        upload
      },
      plan
    )

    expect(upload.mock.calls.map(([item]) => item.key)).toEqual([
      'snailsync/v1.2.3/snailsync-linux-amd64.tar.gz',
      'snailsync/v1.2.3/install.sh',
      'snailsync/v1.2.3/manifest.json',
      'snailsync/v1.2.3/checksums.txt',
      'snailsync/latest/snailsync-linux-amd64.tar.gz',
      'snailsync/latest/install.sh',
      'snailsync/install.sh'
    ])
    expect(report.versionUrls).toEqual([
      'https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz',
      'https://download.example.com/snailsync/v1.2.3/install.sh'
    ])
    expect(report.latestUrls).toEqual([
      'https://download.example.com/snailsync/latest/snailsync-linux-amd64.tar.gz',
      'https://download.example.com/snailsync/latest/install.sh'
    ])
    expect(report.installShUrl).toBe(
      'https://download.example.com/snailsync/install.sh'
    )
    expect(report.summaryMarkdown).toContain('## 又拍云发布成功')
  })

  it('latest 阶段失败时停止并返回阶段错误', async () => {
    const config = buildReleaseTargetConfig(inputs)
    const plan = await prepareUploadPlan(
      inputs,
      config,
      async (filePath: string) => {
        if (filePath === 'dist/snailsync-linux-amd64.tar.gz') {
          return Buffer.from('linux-binary')
        }

        return Buffer.from('#!/bin/sh\necho install\n')
      },
      {
        generatedAt: '2026-03-20T08:00:00.000Z'
      }
    )

    const upload = jest.fn(async (item: { key: string }) => {
      if (item.key === 'snailsync/latest/snailsync-linux-amd64.tar.gz') {
        throw new Error('latest failed')
      }
    })

    await expect(
      publishRelease(
        {
          upload
        },
        plan
      )
    ).rejects.toMatchObject<UploadPhaseError>({
      phase: 'latest',
      uploadedUrls: [
        'https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz',
        'https://download.example.com/snailsync/v1.2.3/install.sh',
        'https://download.example.com/snailsync/v1.2.3/manifest.json',
        'https://download.example.com/snailsync/v1.2.3/checksums.txt'
      ]
    })

    expect(upload).not.toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'snailsync/install.sh'
      })
    )
  })

  it('要求固定 install.sh 时必须存在 install.sh 文件', async () => {
    const config = buildReleaseTargetConfig({
      ...inputs,
      files: ['dist/snailsync-linux-amd64.tar.gz']
    })

    await expect(
      prepareUploadPlan(
        {
          ...inputs,
          files: ['dist/snailsync-linux-amd64.tar.gz']
        },
        config,
        async () => Buffer.from('linux-binary')
      )
    ).rejects.toThrow(
      new ActionInputError(
        '启用 upload_install_sh 时，files 中必须包含 install.sh。'
      )
    )
  })
})
