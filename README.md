# lotion

Notion → Local Markdown Sync CLI

Notion のデータベースをローカルの Markdown ファイルに同期します。Claude Code などのローカルツールから Notion のコンテンツを読めるようにすることが目的です。

## 特徴

- Notion API v2025-09-03 (`@notionhq/client` v5) に対応
- データベース内の全ページを Markdown + YAML frontmatter に変換
- 差分検出による高速な増分同期
- `watch` モードで継続的な自動同期
- 日本語ファイル名対応

## 必要なもの

- [Bun](https://bun.sh) v1.0 以上
- Notion Integration トークン (`secret_...`)

## インストール

```bash
git clone https://github.com/Kohsuk3/lotion.git
cd lotion
bun install
```

バイナリとしてビルドする場合：

```bash
bun build bin/lotion.ts --compile --outfile dist/lotion
# PATH の通った場所にコピー
cp dist/lotion /usr/local/bin/lotion
```

## セットアップ

### 1. Notion Integration を作成

1. [notion.so/my-integrations](https://www.notion.so/my-integrations) を開く
2. 「New integration」をクリックして Integration を作成
3. API キー (`secret_...`) をコピー
4. 同期したいデータベースのページで `•••` → `Connections` から Integration を追加

### 2. 初期設定

```bash
bun run bin/lotion.ts init
```

対話形式で以下を設定します：

- Notion API キー
- 出力先ディレクトリ（デフォルト: `~/lotion-data`）
- 同期間隔（デフォルト: 60秒）
- 同期対象のデータベース

設定は `~/.lotion.yaml` に保存されます（パーミッション `0o600`）。

## 使い方

```bash
# 全ターゲットを同期
bun run bin/lotion.ts sync

# 特定のデータベースのみ同期
bun run bin/lotion.ts sync --only "Projects"

# 継続同期（デフォルト: 設定ファイルの sync_interval 秒ごと）
bun run bin/lotion.ts watch

# 同期間隔を指定
bun run bin/lotion.ts watch --interval 30
```

## 設定ファイル

`~/.lotion.yaml`

```yaml
notion_api_key: secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
output_dir: ~/lotion-data
sync_interval: 60
targets:
  - type: database
    id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    name: Projects
  - type: database
    id: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
    name: Notes
```

| フィールド | 説明 |
|---|---|
| `notion_api_key` | Notion Integration のシークレットキー |
| `output_dir` | Markdown ファイルの出力先 (`~/` 展開対応) |
| `sync_interval` | `watch` モードの同期間隔（秒） |
| `targets` | 同期対象のデータベース一覧 |

## 出力形式

```
~/lotion-data/
├── Projects/
│   ├── project-alpha.md
│   └── roadmap-2026.md
├── Notes/
│   ├── 会議メモ.md
│   └── ideas.md
└── .lotion-state.json
```

各ファイルは YAML frontmatter + Markdown 本文で構成されます：

```markdown
---
title: "Project Alpha"
status: "In Progress"
tags:
  - work
  - urgent
due_date: "2026-03-15"
notion_id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
notion_url: "https://www.notion.so/..."
last_synced: "2026-02-24T10:30:00.000Z"
---

# Project Alpha

...
```

### ファイル名の命名規則

| タイトル | ファイル名 |
|---|---|
| `Project Alpha (Draft)` | `project-alpha-draft.md` |
| `会議メモ 2026` | `会議メモ 2026.md` |
| （タイトルなし） | `{notion_id先頭8文字}.md` |
| ファイル名が衝突した場合 | `project-alpha-{id先頭4文字}.md` |

### 対応ブロックタイプ

paragraph, heading 1/2/3, bulleted list, numbered list, to_do, toggle, quote, callout, code, divider, equation, image, video, file, pdf, bookmark, embed, table, column, synced block, child page, child database

## 差分検出

`.lotion-state.json` に各ページの `last_edited_time` を記録し、変更のあったページのみ変換・書き込みを行います。2回目以降の同期は大幅に高速化されます。

## 開発

```bash
# テスト実行
bun test

# 型チェック
bun x tsc --noEmit

# バイナリビルド
bun build bin/lotion.ts --compile --outfile dist/lotion
```

## ライセンス

MIT
