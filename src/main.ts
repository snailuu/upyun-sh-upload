import * as core from '@actions/core'
import { buildReleaseTargetConfig } from './config.js'
import { parseActionInputs } from './inputs.js'
import { buildActionOutputs } from './outputs.js'
import { writeJobSummary } from './summary.js'
import { createUpyunClient } from './upyun-client.js'
import { prepareUploadPlan, publishRelease } from './uploader.js'

type RunDependencies = {
  parseActionInputs: typeof parseActionInputs
  buildReleaseTargetConfig: typeof buildReleaseTargetConfig
  createUpyunClient: typeof createUpyunClient
  prepareUploadPlan: typeof prepareUploadPlan
  publishRelease: typeof publishRelease
  writeJobSummary: typeof writeJobSummary
}

export async function run(
  overrides: Partial<RunDependencies> = {}
): Promise<void> {
  await runWithDependencies({
    parseActionInputs,
    buildReleaseTargetConfig,
    createUpyunClient,
    prepareUploadPlan,
    publishRelease,
    writeJobSummary,
    ...overrides
  })
}

export async function runWithDependencies(
  deps: RunDependencies
): Promise<void> {
  try {
    const inputs = deps.parseActionInputs()
    const config = deps.buildReleaseTargetConfig(inputs)
    const client = deps.createUpyunClient({
      bucket: inputs.bucket,
      operator: inputs.operator,
      password: inputs.password
    })
    const plan = await deps.prepareUploadPlan(
      inputs,
      config,
      async (filePath) => {
        const { promises: fs } = await import('node:fs')
        return fs.readFile(filePath)
      }
    )
    const report = await deps.publishRelease(client, plan)
    const outputs = buildActionOutputs({
      versionUrls: report.versionUrls,
      latestUrls: report.latestUrls,
      installShUrl: report.installShUrl,
      manifestUrl: report.manifestUrl,
      summaryMarkdown: report.summaryMarkdown
    })

    for (const [key, value] of Object.entries(outputs)) {
      core.setOutput(key, value)
    }

    await deps.writeJobSummary(report.summaryMarkdown)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            typeof error.message === 'string'
          ? error.message
          : '未知错误'
    const summaryMarkdown =
      typeof error === 'object' &&
      error !== null &&
      'summaryMarkdown' in error &&
      typeof error.summaryMarkdown === 'string'
        ? error.summaryMarkdown
        : undefined

    if (summaryMarkdown) {
      await deps.writeJobSummary(summaryMarkdown)
    }

    core.setFailed(message)
  }
}
