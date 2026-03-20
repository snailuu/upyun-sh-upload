import * as core from '@actions/core'
export async function run(): Promise<void> {
  try {
    core.info('upyun-sh-upload action 已初始化，等待后续模块接入。')
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
