# 系统架构跃迁：可行性评估与实施路径
**评估日期：2026-04-25 | 评估人：小7**

---

## 一、知识活化：Obsidian 每日语义分析与双链重构

### 核心工具
- `python` + `numpy` / `scikit-learn`（文本向量化）
- Obsidian Local REST API插件（`obsidian-local-rest-api`）
- 或直接读写 `C:\Obsidian_Vault\*.md`（无插件依赖）

### 执行路径

**方案A（无插件，纯本地）：**
```
1. 扫描 vault 所有 .md 文件
2. 用 TF-IDF 或 sentence-transformers 提取语义向量
3. 计算笔记间余弦相似度
4. 自动在对应位置插入 [[wikilinks]]
5. 输出重构报告到 logs/knowledge，活化完成
```

**方案B（Obsidian API）：**
```
1. Obsidian 开启 Local REST API 插件
2. GET /notes 获取所有笔记列表
3. 对每篇笔记做 embedding + 相似度匹配
4. PATCH /notes/{id} 写入推荐双链
```

**最小可行脚本：**
```powershell
# obsidian-kernel.ps1
# 依赖：Python + scikit-learn
python -c "
from sklearn.feature_extraction.text import TfidfVectorizer
from pathlib import Path
import os

vault = 'C:\\Obsidian_Vault'
docs = [f for f in Path(vault).glob('*.md') if not f.name.startswith('.')]
titles = [f.stem for f in docs]
corpus = [Path(f).read_text(encoding='utf-8') for f in docs]

vec = TfidfVectorizer(stop_words='english', max_features=500)
tfidf = vec.fit_transform(corpus)

# 两两相似度矩阵
sim = (tfidf * tfidf.T).toarray()
for i in range(len(docs)):
    for j in range(i+1, len(docs)):
        if sim[i][j] > 0.15:
            print(f'LINK: [[{titles[i]}]] <-> [[{titles[j]}]] (score={sim[i][j]:.3f})')
"
```

### 调度
```powershell
schtasks /create /tn "OpenClawKnowledgeActivation" /tr "python C:\Obsidian_Vault\pipeline\obsidian-kernel.py >> C:\Obsidian_Vault\logs\knowledge.log" /sc daily /st 03:00 /f
```

---

## 二、预判雷达：GitHub 仓库后台轮询与技术趋势推演

### 核心工具
- `gh` CLI（已授权）+ `gh api`
- `curl` + `jq`（JSON流解析）
- Python `requests`（趋势分析）

### 执行路径

**数据采集层：**
```
每30分钟执行一次 gh api：
  gh api repos/{owner}/{repo}/commits --jq '.[0:10] | .[].sha + "|" + .commit.message'
  gh api repos/{owner}/{repo}/releases --jq '.[0:3]'
  gh api repos/{owner}/{repo}/pulls?state=closed --jq '.[] | select(.merged_at) | .[0:5]'
```

**趋势推演层：**
```
1. 统计 commit message 词频（API变更、文档、bugfix比例）
2. 监控代码行数增长/下降（ --json size）
3. 追踪 release 版本号语义（major.minor.patch跳变）
4. 检测依赖包版本更新信号
5. 生成趋势摘要报告 -> C:\Obsidian_Vault\logs\radar-{date}.json
```

**脚本骨架：**
```powershell
# radar.ps1
$repos = @("openai/openai", "anthropic/claude-code", "microsoft/vscode", "google/gemma")
$results = @()
foreach ($repo in $repos) {
    $commits = gh api repos/$repo/commits --jq '.[0:5] | .[] | .sha[0:7] + " " + .commit.message' 2>$null
    $results += [PSCustomObject]@{Repo=$repo; Commits=$commits; Time=(Get-Date -Format 'HH:mm')}
}
$results | ConvertTo-Json | Out-File "C:\Obsidian_Vault\logs\radar-$(Get-Date -Format 'yyyyMMdd-HHmm').json" -Encoding UTF8
```

### 调度
```powershell
schtasks /create /tn "OpenClawRadar" /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Obsidian_Vault\pipeline\radar.ps1" /sc minute /mo 30 /f
```

---

## 三、代码自愈：stderr 拦截与自动修复补丁生成

### 核心工具
- `Python` stderr 重定向
- `Node.js` `process.stderr` 拦截
- Coding Agent（已集成）
- PowerShell 错误捕获 `$Error` 变量

### 执行路径

**Python 自愈：**
```powershell
# python-heal.ps1
$script = "C:\Obsidian_Vault\test-script.py"
$errLog = "C:\Obsidian_Vault\logs\python-err.log"
$fixDir = "C:\Obsidian_Vault\patches"

$output = python $script 2>&1
if ($LASTEXITCODE -ne 0) {
    $errContent = $output | Where-Object { $_ -match "Error|Traceback|Exception" }
    $errContent | Out-File $errLog -Append
    
    # 提取关键错误
    $errorType = ($errContent | Select-String "(\w+Error)").Matches[0].Value
    $errorLine = ($errContent | Select-String "line (\d+)").Matches[0].Groups[1].Value
    
    # 触发修复（调用 coding agent 或直接用 sed/AWK热修复）
    # 生成 patch 文件
    $patchFile = "$fixDir\fix-$(Get-Date -Format 'yyyyMMdd-HHmmss').patch"
    "Python Error: $errorType at line $errorLine" | Out-File $patchFile -Encoding UTF8
    
    # Windows原生通知
    Add-Type -AssemblyName System.Windows.Forms
    $n = New-Object System.Windows.Forms.NotifyIcon
    $n.Icon = [System.Drawing.SystemIcons]::Warning
    $n.Visible = $true
    $n.ShowBalloonTip(5000, "Xiao7 修复补丁", "$errorType 已生成", "Warning")
    Start-Sleep 4
    $n.Dispose()
}
```

**Node.js 自愈：**
```powershell
# node-heal.ps1
$errFile = "C:\Obsidian_Vault\logs\node-err.log"
node $script 2>&1 | Tee-Object -File $errFile
if ($LASTEXITCODE -ne 0) {
    $content = Get-Content $errFile -Raw
    # 解析 SyntaxError / TypeError / ReferenceError
    # 调用 sed 模式匹配修复常见错误
}
```

**Python 热修复策略（不依赖 LLM 的快速自愈）：**
| 错误模式 | 修复动作 |
|----------|---------|
| `IndentationError` | `pip install autopep8; autopep8 --in-place` |
| `ModuleNotFoundError` | `pip install {module}` |
| `SyntaxError` | 提取错误行，前后文分析括号/引号缺失 |
| `NameError` | 扫描未定义变量，插入定义或 import |
| `TypeError: unsupported operand` | 检查类型转换逻辑 |

### 进程守护调度
```powershell
schtasks /create /tn "OpenClawPythonHeal" /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Obsidian_Vault\pipeline\python-heal.ps1" /sc minute /mo 10 /f
schtasks /create /tn "OpenClawNodeHeal" /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Obsidian_Vault\pipeline\node-heal.ps1" /sc minute /mo 10 /f
```

---

## 实施优先级矩阵

| 维度 | 复杂度 | 工具依赖 | 建议优先级 |
|------|--------|---------|-----------|
| 知识活化 | ★★★ | Python + scikit-learn | P1（无外部依赖，立即可跑）|
| 预判雷达 | ★★☆ | gh CLI | P2（已就绪，15分钟开通）|
| 代码自愈 | ★★★ | Python + coding agent | P3（需要调试拦截逻辑）|

---

*本文档为静默评估文件，由小7自动生成 · 2026-04-25*
