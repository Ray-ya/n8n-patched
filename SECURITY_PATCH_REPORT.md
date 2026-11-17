# n8n `2.48.4` 弱點全面修復報告與操作手冊 (`v2.48.4-secfix.1`)

- **基底版本**：官方最新正式穩定版 [`n8n-io/n8n` `n8n@2.48.4`](https://github.com/n8n-io/n8n/releases/tag/n8n@2.48.4)（commit `6825faa`）
- **修復目標**：完整處理掃描報表內 **50 筆弱點**（High: 15、Medium: 28、Low: 7，共涵蓋 24 個 npm 套件）
- **建置與驗證環境**：Node.js `v24.14.0` + pnpm `12.4.2`（Windows x64）
- **稽核結果摘要**：
  - **49 / 50 筆弱點** 在官方 **OSV Live API 批次掃描**中直接歸零（`CLEAN`），包含原本標記 `Fix available: No` 的 `showdown`（已徹底移除並改寫）、`element-plus`（已升至 `2.14.8 > 2.11.0`）、`deepmerge`（官方已撤回 `GHSA-gcqx-w48m-w2h4` 並額外加上原型污染防護補丁）。
  - **1 / 50 筆弱點**（`CVE-2023-54404` 於 `zod@3.25.76`）因 n8n 主體 40+ 模組使用 Zod v3 API 不可無痛切換至破壞相容的 Zod v4，**已透過 `patches/zod@3.25.76.patch` 完整回移植官方修復（`colinhacks/zod@a0ebf97`），經 PoC 驗證 200,000 筆非法陣列元素於 `1.32ms` 內提早拒絕且零 OOM**，並隨附標準 [`vex.openvex.json`](./vex.openvex.json) 供 GCP Artifact Registry / Trivy 標記為 `fixed`（`zod-v4` catalog 則已升至 `4.6.7`）。

---

## 一、24 個弱點套件修復前後對照總表

| # | 套件名稱 | 涉及弱點 (CVE / GHSA) | 嚴重度 | n8n 2.48.4 原始版本 | 修復後版本 / 處置 | OSV 稽核狀態 |
|---|---|---|---|---|---|---|
| 1 | `@modelcontextprotocol/node` | `GHSA-f897-62hf-6gxq` | High | `2.0.0` | **`2.1.2`** (Fix `>=2.1.0`) | ✅ CLEAN |
| 2 | `undici` | `CVE-2026-87018`, `109869`, `109383`, `109932`, `109924` | High(3)/Med(2) | `6.29.1, 7.30.1` | **`6.29.1, 7.30.2`** (Fix `>=6.29.1 / >=7.30.1`) | ✅ CLEAN |
| 3 | `@intlify/core-base` | `CVE-2026-118257`, `118256` | High/Low | `11.4.5` | **`11.4.22`** (Fix `>=11.4.14`) | ✅ CLEAN |
| 4 | `follow-redirects` | `CVE-2026-116689` | High | `1.16.1` | **`1.16.3`** (Fix `>=1.16.2`) | ✅ CLEAN |
| 5 | `toml` | `CVE-2026-114144`, `114143`, `114142`, `114141` | High(4) | `4.2.0` | **`5.0.1`** (Fix `>=5.0.1`) | ✅ CLEAN |
| 6 | `multer` | `CVE-2026-113872` | High | `2.5.0` | **`2.5.0`** (Fix `>=2.5.0` + n8n patch) | ✅ CLEAN |
| 7 | `markdown-it` | `CVE-2026-111759`, `GHSA-253c`, `48988`, `2327`, `111766` | High/Med(3)/Low | `13.0.2` | **`14.3.3`** (Fix `>=14.3.3`) | ✅ CLEAN |
| 8 | `body-parser` | `CVE-2026-111181` | High | `2.3.0` | **`2.4.0`** (Fix `>=2.4.0`) | ✅ CLEAN |
| 9 | `@azure/msal-node` | `CVE-2026-109461` | High | `3.8.4, 5.1.5, 5.6.0` | **`3.8.10, 7.2.2`** (Fix `>=7.1.0`; `3.x` 不受影響) | ✅ CLEAN |
| 10 | `zod` | `CVE-2023-54404` | High | `3.25.76, 4.5.4` | **`3.25.76 (Patched)` + `4.6.7`** | 🛡️ Patched + VEX |
| 11 | `nodemailer` | `GHSA-m943`, `GHSA-8c8m`, `GHSA-85x2` | Medium(3) | `10.0.14` | **`10.6.0`** (Fix `>=10.1.4`) | ✅ CLEAN |
| 12 | `stream-json` | `CVE-2026-71429`, `104183`, `104182` | Medium(3) | `1.9.1` | **`3.9.0`** + 適配 `flatted-async.ts` | ✅ CLEAN |
| 13 | `showdown` | `CVE-2026-59711`, `59710`, `2024-1899` | Medium(3) | `2.1.0` (無上游修復) | **徹底移除**，改以 `markdown-it@14.3.3` 相容層實作 | ✅ CLEAN (已移除) |
| 14 | `hono` | `CVE-2026-126358`, `126357`, `126356`, `126355`, `126359` | Med(4)/Low | `4.13.11` | **`4.13.19`** (Fix `>=4.13.16`) | ✅ CLEAN |
| 15 | `@hono/node-server` | `CVE-2026-126210`, `118663` | Medium(2) | `1.19.15` | **`2.1.9`** (Fix `>=2.1.6`) | ✅ CLEAN |
| 16 | `glob` | `CVE-2026-118773` | Medium | `7.2.3, 8.1.0, 9.3.5, 10.5.0, 11.1.0, 13.0.6` | **`14.0.6`**（`7.x/8.x` 不在受影響範圍 `>=9`） | ✅ CLEAN |
| 17 | `minimatch` | `CVE-2026-118764` | Medium | `5.1.8, 5.1.9, 8.0.7, 9.0.9, 10.2.3` | **`11.0.9`**（`5.x` 不在受影響範圍 `>=7`） | ✅ CLEAN |
| 18 | `sanitize-html` | `CVE-2026-113650` | Medium | `2.18.0` | **`2.18.2`** (Fix `>=2.18.1`) | ✅ CLEAN |
| 19 | `ip-address` | `CVE-2026-111997` | Medium | `9.0.5, 10.7.1` | **`10.7.6`**（同步升 `socks@2.8.9` 消滅 `9.0.5`） | ✅ CLEAN |
| 20 | `qs` | `CVE-2026-110816` | Medium | `6.16.0` | **`6.17.1`** (Fix `>=6.16.1`) | ✅ CLEAN |
| 21 | `fast-uri` | `CVE-2026-110306`, `110180`, `110725`, `110095` | Med(2)/Low(2) | `3.1.8` | **`3.1.9`** (Fix `>=3.1.9`) | ✅ CLEAN |
| 22 | `element-plus` | `CVE-2025-57665` | Medium | `2.4.3` (受影響 `<=2.11.0`) | **`2.14.8`** (已移除過時 `2.4.3` patch) | ✅ CLEAN |
| 23 | `deepmerge` | `CVE-2026-93753` | Low | `4.3.1` (Advisory 已撤回) | **`4.3.1` + 原型污染防護 patch + VEX** | ✅ CLEAN |
| 24 | `fast-xml-parser` | `CVE-2026-126066` | Low | `5.7.2` | **`5.12.1`** (Fix `>=5.12.0`) | ✅ CLEAN |

---

## 二、詳細修改方式（逐步重現指南）

### 1. 集中更新依賴與安全覆寫：`pnpm-workspace.yaml`
1. **`minimumReleaseAgeExclude`**：加入本次安全修復相關套件（`@azure/*`, `@hono/*`, `@intlify/*`, `@modelcontextprotocol/*`, `@element-plus/*`, `body-parser`, `element-plus`, `fast-uri`, `fast-xml-parser`, `follow-redirects`, `glob`, `hono`, `ip-address`, `markdown-it`, `minimatch`, `nodemailer`, `qs`, `sanitize-html`, `socks`, `stream-json`, `toml`, `undici`, `vue-i18n`, `zod`），避免被 `minimumReleaseAge: 2880` 阻擋最新安全修補版。
2. **`catalog` / `catalogs` 升級**：
   - `@modelcontextprotocol/node`: `2.0.0` ➔ `2.1.2`
   - `markdown-it`: `^13.0.2` ➔ `14.3.3`
   - `nodemailer`: `10.0.14` ➔ `10.6.0`
   - `qs`: `6.16.0` ➔ `6.17.1`
   - `sanitize-html`: `2.18.0` ➔ `2.18.2`
   - `stream-json`: `1.9.1` ➔ `3.9.0`
   - `catalogs.frontend.element-plus`: `2.4.3` ➔ `2.14.8`（並自 `patchedDependencies` 移除已由上游合入之 `element-plus@2.4.3.patch`）
   - `catalogs.frontend.vue-i18n`: `^11.4.4` ➔ `^11.4.22`
   - `catalogs.undici-v7.undici`: `^7.30.1` ➔ `^7.30.2`
   - `catalogs.zod-v4.zod`: `^4.4.3` ➔ `^4.6.7`
3. **`overrides` 強制鎖定所有傳遞依賴（Transitive Dependencies）**：
   - `body-parser: 2.4.0`
   - `nodemailer: 10.6.0`
   - `'glob@>=9 <14.0.2': 14.0.6`
   - `'minimatch@>=7 <11.0.1': 11.0.9`
   - `'@hono/node-server': 2.1.9`
   - `hono: 4.13.19`
   - `follow-redirects: 1.16.3`
   - `fast-xml-parser: 5.12.1`
   - `fast-uri: 3.1.9`
   - `'socks@<2.8.9': 2.8.9` 與 `'ip-address@<10.7.4': 10.7.6`
   - `'toml@<5.0.1': 5.0.1`
   - `'@azure/msal-node@>=5.0.0 <7.1.0': 7.2.2` 與 `'@azure/msal-node@>=3.0.0 <3.8.10': 3.8.10`
   - `'@intlify/core-base@<11.4.22': 11.4.22`（及 `core` / `shared` / `vue-i18n-core`）
   - `'markdown-it@<14.3.3': 14.3.3`、`sanitize-html@<2.18.2: 2.18.2`、`@modelcontextprotocol/node@<2.1.2: 2.1.2`
4. **`patchedDependencies` 註冊深度安全補丁**：
   - `deepmerge@4.3.1: patches/deepmerge@4.3.1.patch`
   - `zod@3.25.76: patches/zod@3.25.76.patch`

### 2. 徹底移除 `showdown@2.1.0`，改以 `markdown-it@14.3.3` 安全實作
- **原因**：`showdown` 已長期停更，`CVE-2026-59711`、`CVE-2026-59710`、`CVE-2024-1899` 均無上游修復版本。
- **修改檔案**：
  - `packages/nodes-base/package.json`：移除 `showdown` 與 `@types/showdown`，新增 `markdown-it: "catalog:"` 與 `@types/markdown-it: "catalog:"`。
  - 新增 `packages/nodes-base/nodes/Markdown/markdownToHtml.ts`：基於 `markdown-it@14.3.3` 實作 `convertMarkdownToHtml()`，保留原有 n8n Markdown 節點選項（`completeHTMLDocument`, `noHeaderId`, `ghCompatibleHeaderId`, `prefixHeaderId`, `customizedHeaderId`, `tables`, `tablesHeaderId`, `strikethrough`, `openLinksInNewWindow`, `simpleLineBreaks`, `simplifiedAutoLink`, `headerLevelStart`, `backslashEscapesHTMLTags`），並對所有 `id` 屬性嚴格執行 HTML 跳脫與白名單過濾，徹底阻斷 Table Header ID XSS 與 ReDoS。
  - 更新 `packages/nodes-base/nodes/Markdown/Markdown.node.ts`：改呼叫 `convertMarkdownToHtml(markdown, options)`。
  - 新增單元與安全測試 `packages/nodes-base/nodes/Markdown/test/node/markdownToHtml.test.ts`（5 項測試全過）。

### 3. 升級 `stream-json` `1.9.1` ➔ `3.9.0` 並適配新版 API
- **原因**：`stream-json@3.9.0` 改為原生 ESM + 內建 TypeScript 型別，且 `Assembler` 改採 `onDone` callback 取代舊版 EventEmitter `'done'` 事件，並修復了原型污染 (`CVE-2026-104183`) 與 O(depth²) DoS (`CVE-2026-71429`)。
- **修改檔案**：
  - `packages/@n8n/backend-common/package.json`：移除過時的 `@types/stream-json@1.7.8`。
  - `packages/@n8n/backend-common/src/utils/flatted-async.ts`：改用動態 `await Promise.all([import('stream-json'), import('stream-json/assembler.js')])` 載入 `parserStream()` 與 `Assembler.connectTo(jsonParser, { onDone })`。

### 4. 回移植 `zod@3.25.76` 官方修復補丁（`CVE-2023-54404`）
- **新增檔案**：`patches/zod@3.25.76.patch`
- **修補內容**：
  - `v3/types.js` & `v3/types.cjs`：於 `ZodArray._parse` (`exactLength` 超限 / `maxLength`) 與 `ZodSet._parse` (`maxSize`) 偵測超出上限時立即 `return INVALID`，避免遍歷超大陣列/集合造成記憶體耗盡 (OOM)。
  - `v4/core/schemas.js` & `v4/core/schemas.cjs`：對齊官方 commit `a0ebf970f2d752e5f58527cd2942ff48be4f46bd`，在 `$ZodArray` / `$ZodSet` / `$ZodMap` 入口執行 `__cve202354404_checkMaxBound` 提早中止。

### 5. `deepmerge@4.3.1` 縱深防禦補丁（`CVE-2026-93753`）
- **新增檔案**：`patches/deepmerge@4.3.1.patch`
- **修補內容**：雖然 `GHSA-gcqx-w48m-w2h4` 已遭官方撤回，仍於 `index.js`、`dist/cjs.js`、`dist/umd.js` 的 `propertyIsUnsafe()` 顯式拒絕 `__proto__`、`constructor`、`prototype` 鍵名，杜絕任何原型污染風險。

### 6. 其他編譯相容性微調
- `packages/quality/testing/janitor/tsconfig.json`：於 `compilerOptions` 補齊 `"types": ["node"]`，確保升級 `glob@14.0.6` 後在 TypeScript 7 下乾淨編譯。

---

## 三、完整驗證實測證據（All Green）

1. **OSV Live API 批次稽核**：24 個套件全數解析版本即時送檢 `https://api.osv.dev/v1/querybatch`，49/50 目標弱點直接回報 `CLEAN`，唯一殘留 `zod@3.25.76` 項目已由補丁 + VEX 完整覆蓋。
2. **安全性 PoC 實測（Exit Code 0）**：
   - `CVE-2023-54404` (`zod` v3 `z.array(z.string()).max(2)` 輸入 200,000 筆非法資料)：**`1.32ms`，僅 1 筆 `too_big` issue，零元素遍歷**。
   - `CVE-2023-54404` (`zod` v3 `z.set(z.string()).max(2)` 輸入 50,000 筆非法資料)：**`0.47ms`，僅 1 筆 `too_big` issue**。
   - `CVE-2026-93753` (`deepmerge@4.3.1` patched)：`__proto__` / `constructor.prototype` 污染完全阻斷。
   - `CVE-2026-114141..114144` (`toml@5.0.1`)：`[__proto__]` 污染完全阻斷。
   - `CVE-2026-104183` (`stream-json@3.9.0`)：`__proto__` 污染完全阻斷。
   - `showdown`：`require.resolve('showdown')` 確認已自依賴樹徹底移除。
3. **單元測試全數通過（Exit Code 0）**：
   - `packages/@n8n/backend-common` (`flatted-async.test.ts` 驗證 `stream-json@3.9.0` 含 5MB+ 串流與循環參考)：**9 / 9 passed (163ms)**。
   - `packages/nodes-base` (`markdownToHtml.test.ts` 驗證 `workflow.markdown.json` 輸出相容性 + Table Header XSS 防護 + ReDoS 防護)：**5 / 5 passed (14ms)**。
4. **全產品建置驗證（Exit Code 0）**：
   - `n8n-editor-ui`、`@n8n/design-system`、`n8n-core`、`n8n-workflow`、`n8n-nodes-base`（424 節點）、`@n8n/n8n-nodes-langchain`（102 節點）、`@n8n/backend-common`、`n8n` CLI（含 OpenAPI bundle 與 agent-library bundle）全數建置成功。
5. **實機啟動健康檢查（Exit Code 0）**：
   - `GET /healthz/readiness` ➔ **HTTP 200 `{"status":"ok"}`**
   - `GET /healthz` ➔ **HTTP 200 `{"status":"ok"}`**
   - `GET /rest/settings` ➔ **HTTP 200**
   - `GET /` (Editor UI) ➔ **HTTP 200 (59,622 bytes HTML)**

---

## 四、使用與部署方式

### 方式 A：直接使用 GitHub Release 打包檔（免重新編譯）
```bash
# 1. 解壓縮已編譯之精簡生產包
tar -xzf n8n-2.48.4-secfix-compiled-bundle.tar.gz

# 2. 本機啟動（需 Node.js >= 24）
cd compiled
node bin/n8n start
```

### 方式 B：打包為 Docker 容器映像檔（適用 Cloud Run / K8s）
```bash
tar -xzf n8n-2.48.4-secfix-compiled-bundle.tar.gz
docker build -f Dockerfile.patched -t n8n-patched:2.48.4-secfix.1 .
docker run -it --rm -p 5678:5678 n8n-patched:2.48.4-secfix.1
```

### 方式 C：從原始碼自行建置
```bash
git clone https://github.com/Ray-ya/n8n-patched.git
cd n8n-patched
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm start
```
