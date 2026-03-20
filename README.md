# upyun-sh-upload

[![CI](https://github.com/snailuu/upyun-sh-upload/actions/workflows/ci.yml/badge.svg)](https://github.com/snailuu/upyun-sh-upload/actions/workflows/ci.yml)
[![Check dist](https://github.com/snailuu/upyun-sh-upload/actions/workflows/check-dist.yml/badge.svg)](https://github.com/snailuu/upyun-sh-upload/actions/workflows/check-dist.yml)

将私有仓库的发布产物上传到又拍云，并输出一组可公开访问的下载地址、`manifest.json`、`checksums.txt`
和 Job Summary。

这个 Action 适合这样的场景：代码仓库保持私有，但安装脚本、二进制包和元数据需要通过公开 CDN 地址分发给最终用户。

> [!TIP] 这个 Action 只负责上传与汇总，不限制触发方式。你可以在
> `release`、`workflow_dispatch`、标签推送或任意自定义 workflow 中调用它。

## 为什么用它

- 私有仓库无法直接用 `raw.githubusercontent.com` 暴露安装脚本和发布产物。
- 又拍云可以承接公开下载流量，而发布流程仍然留在 GitHub Actions 中统一执行。
- Action 会自动整理版本目录、`latest` 目录和固定入口
  `install.sh`，减少发布脚本分叉。
- 成功执行后会在 Job Summary 中展示所有上传地址，方便人工核对和后续复制。

## 会发布什么

默认情况下，这个 Action 会围绕一次版本发布生成以下内容：

- `version` 地址
  - 例如：`https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz`
- `latest` 地址
  - 例如：`https://download.example.com/snailsync/latest/snailsync-linux-amd64.tar.gz`
- `install.sh` 固定入口
  - 可选启用，适合 `curl -fsSL ... | sh`
- `manifest.json`
  - 描述本次上传的文件清单、大小和 sha256
- `checksums.txt`
  - 可选生成，适合校验下载文件
- Job Summary
  - 在 workflow summary 中展示服务名、版本号和全部公开地址

上传顺序为：

1. 当前版本目录
2. `latest` 目录
3. 固定入口 `install.sh`

如果某一阶段失败，Action 会停止后续上传，并把已经成功上传的地址写进失败摘要里。

## 快速开始

下面是一个最短可用示例。触发方式你可以按自己的发布流程调整：

```yaml
name: Release Upload

on:
  release:
    types:
      - published

permissions:
  contents: read

jobs:
  upload:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Build files
        run: |
          mkdir -p dist
          printf 'binary-content' > dist/snailsync-linux-amd64.tar.gz
          printf '#!/bin/sh\necho install\n' > dist/install.sh

      - name: Upload to Upyun
        uses: snailuu/upyun-sh-upload@v1
        with:
          service: snailsync
          version: ${{ github.event.release.tag_name }}
          files: |
            dist/snailsync-linux-amd64.tar.gz
            dist/install.sh
          bucket: ${{ secrets.UPYUN_BUCKET }}
          operator: ${{ secrets.UPYUN_OPERATOR }}
          password: ${{ secrets.UPYUN_PASSWORD }}
          cdn_base_url: ${{ secrets.UPYUN_CDN_BASE_URL }}
          latest: true
          upload_install_sh: true
          generate_checksums: true
          overwrite: false
```

仓库内也提供了一份可直接参考的示例 workflow：

- [.github/workflows/example.yml](.github/workflows/example.yml)

## 工作方式

Action 会先读取 `files` 中声明的本地文件，再根据 `service`、`version` 和
`cdn_base_url` 生成一组规范化的目标路径与公开地址。

以如下输入为例：

- `service`: `snailsync`
- `version`: `v1.2.3`
- `cdn_base_url`: `https://download.example.com`
- `files`:
  - `dist/snailsync-linux-amd64.tar.gz`
  - `dist/install.sh`

生成的公开地址会类似于：

```text
https://download.example.com/snailsync/v1.2.3/snailsync-linux-amd64.tar.gz
https://download.example.com/snailsync/v1.2.3/install.sh
https://download.example.com/snailsync/v1.2.3/manifest.json
https://download.example.com/snailsync/v1.2.3/checksums.txt
https://download.example.com/snailsync/latest/snailsync-linux-amd64.tar.gz
https://download.example.com/snailsync/latest/install.sh
https://download.example.com/snailsync/install.sh
```

> [!NOTE] 当 `upload_install_sh: true` 时，`files` 中必须包含名为 `install.sh`
> 的文件，否则 Action 会直接失败。

## 输入参数

### 必填参数

- `service`
  - 业务标识，用于拼接上传路径，例如 `snailsync`
- `version`
  - 版本号，例如 `v1.2.3`
- `files`
  - 换行分隔的待上传文件路径列表
- `bucket`
  - 又拍云服务名
- `operator`
  - 又拍云操作员
- `password`
  - 又拍云操作员密码
- `cdn_base_url`
  - 对外公开下载域名，例如 `https://download.example.com`

### 可选参数

- `latest`
  - 是否同步 `latest/` 目录
  - 默认值：`true`
- `upload_install_sh`
  - 是否将 `install.sh` 发布到固定入口
  - 默认值：`false`
- `generate_checksums`
  - 是否生成并上传 `checksums.txt`
  - 默认值：`true`
- `overwrite`
  - 是否允许覆盖同版本文件
  - 默认值：`false`

## 输出参数

- `version_urls`
  - 当前版本文件的公开下载地址列表
- `latest_urls`
  - `latest` 目录下的公开下载地址列表
- `install_sh_url`
  - 固定入口 `install.sh` 的公开地址
- `manifest_url`
  - `manifest.json` 的公开地址
- `summary_markdown`
  - 最终写入 Job Summary 的 Markdown 内容

## Job Summary

Action 成功后，会在当前 job 的 summary 中输出：

- 服务名
- 版本号
- `install.sh` 地址
- 当前版本下载地址
- `latest` 下载地址
- `manifest.json` 地址
- `checksums.txt` 地址

这意味着调用方 workflow 不需要再手工拼接这些地址，也不需要额外维护一份发布摘要模板。

## 开发

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run lint
pnpm run package
```
