import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('输出初始化日志', async () => {
    await run()

    expect(core.info).toHaveBeenCalledWith(
      'upyun-sh-upload action 已初始化，等待后续模块接入。'
    )
  })

  it('异常时设置失败状态', async () => {
    core.info.mockImplementationOnce(() => {
      throw new Error('初始化失败')
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('初始化失败')
  })
})
