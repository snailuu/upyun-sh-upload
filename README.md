# upyun-sh-upload

`upyun-sh-upload` 是一个可复用的 GitHub Action，用于将私有仓库构建产物上传到又拍云，并输出公开下载地址、`manifest.json`、`checksums.txt` 以及 Job Summary。

## 目标

- 私有仓库继续保持私有
- 发布产物同步到又拍云公开域名
- 统一生成 `version`、`latest` 和可选 `install.sh` 地址
- 在 workflow summary 中直接展示上传结果

## 当前状态

当前仓库已经基于官方 `actions/typescript-action` 模板完成工程骨架初始化，后续将逐步接入：

- 输入解析与路径规范
- manifest 与 checksums 生成
- 又拍云上传客户端
- Job Summary 与 outputs

## 开发命令

```bash
npm ci
npm test
npm run lint
npm run package
```
