# 开发

## 构建

包管理器为 pnpm。

```sh
pnpm install
pnpm build
```

构建结果位于 `dist/`，包含 CLI、可导入的 API 和 VS Code 扩展。

## 打包

CLI 和 VS Code 扩展需要分别打包；打包前会自动运行对应的构建。

```sh
# 构建 CLI 并生成 md-math-fmt-*.tgz
pnpm package:cli

# 构建扩展并生成 md-math-fmt-*.vsix
pnpm package:extension
```

## 验证

### 静态检查和格式化

项目使用 Biome 检查和格式化 TypeScript、JavaScript 和 JSON

```sh
pnpm check
```

### 类型检查

项目使用 TypeScript 进行类型检查

```sh
pnpm typecheck
```

### 测试

项目使用 Node.js 内置的测试模块进行测试

```sh
pnpm test
```

测试覆盖核心格式化、CLI 和扩展接口。

- 真实 tex-fmt 集成测试在未安装 tex-fmt 时会跳过，完整验证前请确保 `tex-fmt --version` 可执行。当前集成测试使用 tex-fmt 0.5.7。
- 扩展接口测试使用 VS Code API 替身，无法替代在 VS Code 扩展宿主中的手动验证。
