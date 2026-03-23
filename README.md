# TriStage Narrative Studio

一个基于你提供的设计图实现的可运行交互网页，包含：

- 起始生成页
- 意图层
- 结构层
- 动力层
- 试玩页
- OpenRouter `openai/gpt-5.4` 接口接入

## 启动

1. 复制环境变量模板并填入 OpenRouter Key
2. 运行 `npm start`
3. 打开 `http://localhost:3000`

## 环境变量

- `OPENROUTER_API_KEY`: OpenRouter API Key
- `OPENROUTER_MODEL`: 默认 `openai/gpt-5.4`
- `APP_PORT`: 默认 `3000`

未配置 Key 时，系统会使用本地回退示例数据，页面仍可完整交互。
