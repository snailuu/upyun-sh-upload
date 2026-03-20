const { createFailureSummary, createSuccessSummary } =
  await import('../src/summary.js')
const { buildActionOutputs } = await import('../src/outputs.js')

describe('summary.ts', () => {
  it('生成成功摘要', () => {
    const markdown = createSuccessSummary({
      service: 'snailsync',
      version: 'v1.2.3',
      installShUrl: 'https://download.example.com/snailsync/install.sh',
      versionUrls: [
        'https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz'
      ],
      latestUrls: [
        'https://download.example.com/snailsync/latest/snailsync-linux-amd64.tar.gz'
      ],
      manifestUrl:
        'https://download.example.com/snailsync/v1.2.3/manifest.json',
      checksumsUrl:
        'https://download.example.com/snailsync/v1.2.3/checksums.txt'
    })

    expect(markdown).toContain('## 又拍云发布成功')
    expect(markdown).toContain('- 服务：snailsync')
    expect(markdown).toContain('- 版本：v1.2.3')
    expect(markdown).toContain(
      '- install.sh: https://download.example.com/snailsync/install.sh'
    )
    expect(markdown).toContain(
      '- https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz'
    )
    expect(markdown).toContain(
      '- https://download.example.com/snailsync/latest/snailsync-linux-amd64.tar.gz'
    )
    expect(markdown).toContain(
      '- manifest: https://download.example.com/snailsync/v1.2.3/manifest.json'
    )
    expect(markdown).toContain(
      '- checksums: https://download.example.com/snailsync/v1.2.3/checksums.txt'
    )
  })

  it('生成失败摘要', () => {
    const markdown = createFailureSummary({
      service: 'snailsync',
      version: 'v1.2.3',
      failedPhase: 'latest',
      uploadedUrls: [
        'https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz'
      ]
    })

    expect(markdown).toContain('## 又拍云发布失败')
    expect(markdown).toContain('- 失败阶段：latest')
    expect(markdown).toContain(
      '- https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz'
    )
  })
})

describe('outputs.ts', () => {
  it('构造 action 输出字符串', () => {
    const outputs = buildActionOutputs({
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
    })

    expect(outputs).toEqual({
      version_urls:
        'https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz',
      latest_urls:
        'https://download.example.com/snailsync/latest/snailsync-linux-amd64.tar.gz',
      install_sh_url: 'https://download.example.com/snailsync/install.sh',
      manifest_url:
        'https://download.example.com/snailsync/v1.2.3/manifest.json',
      summary_markdown: '## 又拍云发布成功'
    })
  })
})
