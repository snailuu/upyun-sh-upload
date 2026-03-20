# upyun-sh-upload

`upyun-sh-upload` 是一个可复用的 GitHub Action，用于将私有仓库构建产物上传到又拍云，并输出公开下载地址、`manifest.json`、`checksums.txt` 以及 Job Summary。

## 目标

- 私有仓库继续保持私有
- 发布产物同步到又拍云公开域名
- 统一生成 `version`、`latest` 和可选 `install.sh` 地址
- 在 workflow summary 中直接展示上传结果

## 当前状态

当前仓库已经具备一条完整的发布链路：

- 输入解析与路径规范
- manifest 与 checksums 生成
- 又拍云上传客户端
- Job Summary 与 outputs

## 输入

- `service`
  - 业务标识，例如 `snailsync`
- `version`
  - 发布版本，例如 `v1.2.3`
- `files`
  - 换行分隔的待上传文件路径
- `bucket`
  - 又拍云服务名
- `operator`
  - 又拍云操作员
- `password`
  - 又拍云操作员密码
- `cdn_base_url`
  - 对外公开下载域名
- `latest`
  - 是否同步 `latest/`，默认 `true`
- `upload_install_sh`
  - 是否同步固定入口 `install.sh`，默认 `false`
- `generate_checksums`
  - 是否生成 `checksums.txt`，默认 `true`
- `overwrite`
  - 是否允许覆盖同版本文件，默认 `false`

## 输出

- `version_urls`
- `latest_urls`
- `install_sh_url`
- `manifest_url`
- `summary_markdown`

## 调用示例

```yaml
jobs:
  release-upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Build Files
        run: |
          mkdir -p dist
          printf 'binary-content' > dist/snailsync-linux-amd64.tar.gz
          printf '#!/bin/sh\necho install\n' > dist/install.sh

      - name: Upload To Upyun
        uses: snailuu/upyun-sh-upload@v1
        with:
          service: snailsync
          version: ${{ github.ref_name }}
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

仓库内也附带了一份可直接参考的 workflow：

- `.github/workflows/example.yml`

## Summary 展示

Action 成功运行后，会在 Job Summary 中展示：

- 服务名与版本号
- `install.sh` 地址
- 当前版本下载地址
- `latest` 下载地址
- `manifest.json` 与 `checksums.txt` 地址

## 开发命令

```bash
npm ci
npm test
npm run lint
npm run package
```
