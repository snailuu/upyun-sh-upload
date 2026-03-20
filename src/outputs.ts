export interface ActionOutputsInput {
  versionUrls: string[]
  latestUrls: string[]
  installShUrl?: string
  manifestUrl: string
  summaryMarkdown: string
}

function joinLines(lines: string[]): string {
  return lines.join('\n')
}

export function buildActionOutputs(
  input: ActionOutputsInput
): Record<string, string> {
  return {
    version_urls: joinLines(input.versionUrls),
    latest_urls: joinLines(input.latestUrls),
    install_sh_url: input.installShUrl ?? '',
    manifest_url: input.manifestUrl,
    summary_markdown: input.summaryMarkdown
  }
}
