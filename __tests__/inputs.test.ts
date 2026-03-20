import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { ActionInputError } = await import('../src/errors.js')
const { parseActionInputs } = await import('../src/inputs.js')

describe('inputs.ts', () => {
  beforeEach(() => {
    const values: Record<string, string> = {
      service: 'snailsync',
      version: 'v1.2.3',
      files: 'dist/snailsync-linux-amd64.tar.gz\n./dist/install.sh\n',
      bucket: 'download-bucket',
      operator: 'robot',
      password: 'secret',
      cdn_base_url: 'https://download.example.com/',
      latest: 'false',
      upload_install_sh: 'true',
      generate_checksums: '1',
      overwrite: '0'
    }

    core.getInput.mockImplementation((name: string) => values[name] ?? '')
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('解析必填输入与布尔配置', () => {
    const inputs = parseActionInputs()

    expect(inputs).toEqual({
      service: 'snailsync',
      version: 'v1.2.3',
      files: ['dist/snailsync-linux-amd64.tar.gz', './dist/install.sh'],
      bucket: 'download-bucket',
      operator: 'robot',
      password: 'secret',
      cdnBaseUrl: 'https://download.example.com/',
      latest: false,
      uploadInstallSh: true,
      generateChecksums: true,
      overwrite: false
    })
  })

  it('必填输入缺失时抛错', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'service') return '   '
      return 'value'
    })

    expect(() => parseActionInputs()).toThrow(
      new ActionInputError('输入 service 不能为空。')
    )
  })

  it('files 为空时抛错', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'files') return '\n \n'
      return 'value'
    })

    expect(() => parseActionInputs()).toThrow(
      new ActionInputError('输入 files 至少需要包含一个文件路径。')
    )
  })

  it('布尔输入非法时抛错', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'latest') return 'maybe'
      return 'value'
    })

    expect(() => parseActionInputs()).toThrow(
      new ActionInputError('输入 latest 只能是 true/false、1/0、yes/no。')
    )
  })
})
