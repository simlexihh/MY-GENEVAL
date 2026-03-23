const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { buildSampleStudioData, sampleUserIdea } = require("./sample-data");

function loadLocalEnvFile(filename = ".env.local") {
  const envPath = path.join(__dirname, filename);
  if (!fs.existsSync(envPath)) return {};

  const env = {};
  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const delimiterIndex = trimmed.indexOf("=");
    if (delimiterIndex < 0) return;
    const key = trimmed.slice(0, delimiterIndex).trim();
    const rawValue = trimmed.slice(delimiterIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    env[key] = value;
  });
  return env;
}

const localEnv = loadLocalEnvFile();
const root = __dirname;
const publicDir = path.join(root, "public");
const port = Number(String(process.env.PORT || process.env.APP_PORT || localEnv.PORT || localEnv.APP_PORT || 3000).trim());
const host = String(process.env.HOST || localEnv.HOST || "0.0.0.0").trim();
const apiKey = String(process.env.OPENROUTER_API_KEY || localEnv.OPENROUTER_API_KEY || "").trim();
const model = String(process.env.OPENROUTER_MODEL || localEnv.OPENROUTER_MODEL || "openai/gpt-5.4").trim();
const publicBaseUrl = String(
  process.env.PUBLIC_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "") ||
  localEnv.PUBLIC_BASE_URL ||
  `http://localhost:${port}`
).trim();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function extractJson(text) {
  const cleaned = text.trim();
  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return JSON.parse(fenced[1]);
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
  throw new Error("No JSON found in model response");
}

function buildPrompt(userIdea) {
  const schema = {
    title: "故事标题",
    logline: "一句话梗概",
    theme: "主控思想",
    conflictSystem: ["主矛盾", "子矛盾1", "子矛盾2"],
    stateMatrix: [{ category: "生存资源", description: "食物、水源" }],
    experienceGoal: {
      emotionCurve: "升-降-升",
      interactionType: "阶段裁决型"
    },
    structure: {
      overview: {
        mainStrategy: "主结构策略",
        contraction: "收缩级别",
        branchRecovery: "中段分歧与回收方式",
        endingSplit: "终局分化方式"
      },
      chapters: [
        {
          id: "chapter-1",
          name: "第一章",
          stage: "建置",
          acts: [
            {
              id: "chapter-1-act1",
              name: "ACT1",
              nodes: [
                {
                  id: "E1",
                  title: "节点标题",
                  summary: "事件摘要",
                  goal: "节点目标",
                  chapter: "第一章",
                  act: "ACT1",
                  tags: ["普通节点"],
                  keyNode: false,
                  emptyNode: false,
                  nodeType: "普通节点",
                  endingLine: null,
                  decisions: [
                    {
                      id: "D1",
                      title: "决策点名称",
                      description: "该决策的总体描述",
                      effects: [{ key: "food", value: "+10" }],
                      options: [
                        {
                          id: "C1",
                          text: "选项文本",
                          intent: "选项意图",
                          effects: ["food +10"]
                        }
                      ]
                    }
                  ],
                  jumps: [
                    {
                      id: "J1",
                      target: "E2",
                      type: "条件",
                      condition: "默认推进",
                      note: "跳转条件说明"
                    }
                  ],
                  settlement: "节点结算摘要",
                  stateWrites: ["food = 60"]
                }
              ]
            }
          ]
        }
      ],
      edges: [{ from: "E1", to: "E2", kind: "main" }]
    },
    dynamic: {
      ledger: {
        生存资源: [
          { name: "food", kind: "整数", range: "0-100", initial: 50, note: "食物存量" }
        ]
      },
      order: ["E1", "E2"],
      defaultExpandedNodeIds: ["E2"]
    },
    playtest: {
      nodeId: "E2",
      title: "关键节点标题",
      narrative: ["第一段叙述", "第二段叙述"],
      decisionLabel: "D1 决策名称",
      options: [{ id: "C1", title: "选项标题", summary: "选项后果摘要" }],
      statusPanels: [{ title: "生存资源", items: ["food: 50", "water: 50"] }]
    }
  };

  return [
    "你是互动叙事设计系统的生成引擎。",
    "请根据用户的一句话故事想法，生成一个三阶段叙事工作台需要的完整 JSON。",
    "返回内容必须是严格 JSON，不要输出解释，不要输出 markdown 代码块。",
    "输出结构如下：",
    JSON.stringify(schema, null, 2),
    "experienceGoal.emotionCurve 只能是：持续上升、持续下降、先升后降、先降后升、升-降-升、降-升-降。",
    "experienceGoal.interactionType 只能是：推理判断型、探索叙事型、资源管理型、高压责任型、阶段裁决型、关系权衡型。",
    "structure.edges 必须显式给出结构层连接关系。",
    "dynamic.order 必须显式给出动力层卡片顺序。",
    "dynamic.defaultExpandedNodeIds 必须显式给出默认展开的节点编号数组。",
    `用户想法：${userIdea || sampleUserIdea}`
  ].join("\n");
}

function buildFallbackData(userIdea) {
  return buildSampleStudioData(userIdea || sampleUserIdea);
}

function getStudioNodes(studio) {
  return studio?.structure?.chapters?.flatMap((chapter) =>
    (chapter.acts || []).flatMap((act) => act.nodes || [])
  ) || [];
}

function getStudioNodeMap(studio) {
  return new Map(getStudioNodes(studio).map((node) => [node.id, node]));
}

function buildRuntimeVariables(studio, runtimeState = {}) {
  const variables = {};
  const runtimeVariables = runtimeState?.variables || {};

  Object.values(studio?.dynamic?.ledger || {}).forEach((items) => {
    (items || []).forEach((item) => {
      const fallbackValue = Number.isFinite(Number(item?.initial)) ? Number(item.initial) : 0;
      const runtimeValue = runtimeVariables[item?.name];
      variables[item.name] = Number.isFinite(Number(runtimeValue)) ? Number(runtimeValue) : fallbackValue;
    });
  });

  Object.entries(runtimeVariables).forEach(([key, value]) => {
    if (!(key in variables) && Number.isFinite(Number(value))) {
      variables[key] = Number(value);
    }
  });

  return variables;
}

function buildPlaytestStatusPanels(studio, variables) {
  return Object.entries(studio?.dynamic?.ledger || {}).map(([title, items]) => ({
    title,
    items: (items || []).map((item) => `${item.name}: ${variables[item.name] ?? item.initial ?? "-"}`)
  }));
}

function buildFallbackPlaytestOptions(node) {
  const primaryDecision = node?.decisions?.[0];
  if (primaryDecision?.options?.length) {
    return primaryDecision.options.map((option) => ({
      id: option.id,
      title: option.text || option.id,
      summary: option.intent || "这会把局势推向新的方向，具体变化会在右侧状态栏里体现。"
    }));
  }

  if ((node?.jumps || []).length) {
    return [{
      id: "__continue__",
      title: "继续推进",
      summary: "保持当前立场与资源状态，继续面对接下来的局势。"
    }];
  }

  return [{
    id: "__end__",
    title: "结束片段",
    summary: "这个试玩片段在这里告一段落。"
  }];
}

function buildFallbackPlaytestScene(studio, nodeId, runtimeState = {}) {
  const nodes = getStudioNodes(studio);
  const nodeMap = getStudioNodeMap(studio);
  const node = nodeMap.get(nodeId) || nodeMap.get(studio?.playtest?.nodeId) || nodes[0] || null;
  const variables = buildRuntimeVariables(studio, runtimeState);
  const statusPanels = buildPlaytestStatusPanels(studio, variables);
  const primaryDecision = node?.decisions?.[0] || null;
  const lastChoiceText = runtimeState?.lastChoice?.text
    ? `上一轮你选择了“${runtimeState.lastChoice.text}”，这个决定的余波仍在蔓延。`
    : "";

  const narrative = [
    node?.summary || "你正站在故事推进的关键节点上，局势尚未稳定。",
    node?.goal ? `此刻最直接的目标是：${node.goal}。` : "",
    lastChoiceText,
    primaryDecision?.options?.length
      ? "眼前的选项都不只是行动方式的不同，它们也会重新塑造资源、关系与危机的走向。"
      : ((node?.jumps || []).length
          ? "眼下未必有新的明确抉择，但你此前积累的状态会决定接下来的去向。"
          : "这一小段试玩内容暂时走到了尾声，你可以回看前面的选择是如何把你带到这里的。")
  ].filter(Boolean);

  return {
    source: "fallback",
    scene: {
      nodeId: node?.id || "E1",
      title: node?.id || "试玩节点",
      narrative,
      decisionLabel: primaryDecision
        ? `${primaryDecision.id} ${primaryDecision.title}`
        : ((node?.jumps || []).length ? "继续推进" : "片段结束"),
      options: buildFallbackPlaytestOptions(node),
      statusPanels
    }
  };
}

function buildPlaytestPrompt(studio, node, runtimeState, fallbackScene) {
  const primaryDecision = node?.decisions?.[0] || null;
  const context = {
    storyTitle: studio?.title || "",
    logline: studio?.logline || "",
    theme: studio?.theme || "",
    conflictSystem: studio?.conflictSystem || [],
    experienceGoal: studio?.experienceGoal || {},
    node: {
      id: node?.id || "",
      title: node?.title || "",
      summary: node?.summary || "",
      goal: node?.goal || "",
      nodeType: node?.nodeType || "",
      chapter: node?.chapter || "",
      act: node?.act || "",
      jumps: node?.jumps || []
    },
    decision: primaryDecision,
    runtimeState: {
      variables: buildRuntimeVariables(studio, runtimeState),
      lastChoice: runtimeState?.lastChoice || null,
      recentHistory: Array.isArray(runtimeState?.history) ? runtimeState.history.slice(-4) : []
    },
    fallbackScene
  };

  const schema = {
    title: "当前节点标题",
    narrative: ["第一段场景描述", "第二段心理或环境描述", "第三段抉择压力描述"],
    decisionLabel: "D1 决策名称",
    options: [{ id: "C1", title: "选项标题", summary: "第二人称、带代入感的后果预期" }],
    statusPanels: [{ title: "生存资源", items: ["food: 50", "water: 50"] }]
  };

  return [
    "你是文字冒险试玩层的叙事描述引擎。",
    "请根据当前动力层节点和状态，生成更有代入感的试玩文本。",
    "要求：",
    "1. 返回严格 JSON，不要输出解释，不要输出 markdown。",
    "2. 叙述采用第二人称，让玩家感到自己正在做决定。",
    "3. 文字风格要保留悬念、处境压力和情绪张力，但不要凭空改掉节点事实。",
    "4. options 的 id 必须与输入中的选项 id 完全一致；如果当前节点没有显式决策，则保留 fallbackScene.options。",
    "5. options.summary 只能写处境感受、行动风格或后果预期，不要写任何具体数值、百分比、加减号、阿拉伯数字、中文数字、变量名或状态名。",
    "6. 所有数值变化只允许出现在右侧状态栏，不允许出现在选项文案里。",
    "7. statusPanels 可以润色标题展示，但 items 必须保持状态值可读。",
    "JSON 结构：",
    JSON.stringify(schema, null, 2),
    "当前上下文：",
    JSON.stringify(context, null, 2)
  ].join("\n");
}

function normalizePlaytestScene(parsedScene, fallbackScene) {
  const fallbackOptions = Array.isArray(fallbackScene.options) ? fallbackScene.options : [];
  const fallbackOptionIds = new Set(fallbackOptions.map((option) => option.id));
  const parsedOptions = Array.isArray(parsedScene?.options)
    ? parsedScene.options.filter((option) => option?.id && fallbackOptionIds.has(option.id))
    : [];
  const normalizedOptions = fallbackOptions.map((fallbackOption) => {
    const parsedOption = parsedOptions.find((option) => option.id === fallbackOption.id);
    return {
      id: fallbackOption.id,
      title: parsedOption?.title || fallbackOption.title,
      summary: parsedOption?.summary || fallbackOption.summary
    };
  });

  return {
    nodeId: parsedScene?.nodeId || fallbackScene.nodeId,
    title: parsedScene?.title || fallbackScene.title,
    narrative: Array.isArray(parsedScene?.narrative) && parsedScene.narrative.length
      ? parsedScene.narrative
      : fallbackScene.narrative,
    decisionLabel: parsedScene?.decisionLabel || fallbackScene.decisionLabel,
    options: normalizedOptions,
    statusPanels: Array.isArray(parsedScene?.statusPanels) && parsedScene.statusPanels.length
      ? parsedScene.statusPanels
      : fallbackScene.statusPanels
  };
}

async function generatePlaytestScene(studio, nodeId, runtimeState = {}) {
  const fallback = buildFallbackPlaytestScene(studio, nodeId, runtimeState);
  if (!apiKey) {
    return fallback;
  }

  const node = getStudioNodeMap(studio).get(nodeId) || getStudioNodes(studio)[0];
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": publicBaseUrl,
      "X-Title": "TriStage Narrative Studio"
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      messages: [
        { role: "system", content: "你是一名擅长互动文字冒险的叙事设计师。" },
        { role: "user", content: buildPlaytestPrompt(studio, node, runtimeState, fallback.scene) }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error ${response.status}: ${await response.text()}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in OpenRouter response");

  return {
    source: "openrouter",
    model: result.model || model,
    scene: normalizePlaytestScene(extractJson(content), fallback.scene)
  };
}

async function generateStudioData(userIdea) {
  const normalizedIdea = String(userIdea || "").trim();
  if (!apiKey || normalizedIdea === sampleUserIdea) {
    return { source: "fallback", data: buildFallbackData(userIdea) };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": publicBaseUrl,
      "X-Title": "TriStage Narrative Studio"
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        { role: "system", content: "你是一名互动叙事设计师和系统策划。" },
        { role: "user", content: buildPrompt(userIdea) }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error ${response.status}: ${await response.text()}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in OpenRouter response");
  return { source: "openrouter", data: extractJson(content), model: result.model || model };
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(safePath).replace(/^(\.\.[\\/])+/, "");
  const filePath = path.join(publicDir, normalized);
  if (!filePath.startsWith(publicDir)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  fs.readFile(filePath, (err, buffer) => {
    if (err) return sendJson(res, 404, { error: "Not found" });
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(buffer);
  });
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && reqUrl.pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      openrouterConfigured: Boolean(apiKey),
      model
    });
  }

  if (req.method === "POST" && reqUrl.pathname === "/api/generate") {
    try {
      const rawBody = await readRequestBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const idea = String(body.idea || "").trim();
      return sendJson(res, 200, await generateStudioData(idea));
    } catch (error) {
      return sendJson(res, 500, {
        error: error.message,
        fallback: buildFallbackData(sampleUserIdea)
      });
    }
  }

  if (req.method === "POST" && reqUrl.pathname === "/api/playtest/scene") {
    try {
      const rawBody = await readRequestBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const studio = body?.studio || buildFallbackData(sampleUserIdea);
      const runtimeState = body?.runtimeState || {};
      const nodeId = String(body?.nodeId || studio?.playtest?.nodeId || getStudioNodes(studio)[0]?.id || "E1");

      try {
        return sendJson(res, 200, await generatePlaytestScene(studio, nodeId, runtimeState));
      } catch (error) {
        return sendJson(res, 200, {
          error: error.message,
          ...buildFallbackPlaytestScene(studio, nodeId, runtimeState)
        });
      }
    } catch (error) {
      return sendJson(res, 500, {
        error: error.message,
        ...buildFallbackPlaytestScene(buildFallbackData(sampleUserIdea), "E2", {})
      });
    }
  }

  return serveStatic(req, res, reqUrl.pathname);
});

server.listen(port, host, () => {
  console.log(`TriStage Narrative Studio running at ${publicBaseUrl} (bind ${host}:${port})`);
});
