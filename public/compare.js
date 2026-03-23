const uploadScreen = document.getElementById("compare-upload-screen");
const workspaceScreen = document.getElementById("compare-workspace-screen");
const finishScreen = document.getElementById("compare-finish-screen");
const leftInput = document.getElementById("compare-left-input");
const rightInput = document.getElementById("compare-right-input");
const leftFilesBody = document.getElementById("compare-left-files");
const rightFilesBody = document.getElementById("compare-right-files");
const uploadHint = document.getElementById("compare-upload-hint");
const startButton = document.getElementById("compare-start-btn");
const progressTitle = document.getElementById("compare-progress-title");
const progressSubtitle = document.getElementById("compare-progress-subtitle");
const scoreToggleButton = document.getElementById("compare-score-toggle");
const scorePanel = document.querySelector(".compare-score-panel");
const scoreBody = document.getElementById("compare-score-body");
const scoreForm = document.getElementById("compare-score-form");
const submitScoreButton = document.getElementById("compare-submit-score");
const exportProgressButton = document.getElementById("compare-export-progress");
const restartButton = document.getElementById("compare-restart-btn");
const downloadResultsButton = document.getElementById("compare-download-results");
const resultsSummary = document.getElementById("compare-results-summary");

const paneIds = ["left", "right"];
const scoreDimensions = [
  { key: "narrativeConsistency", label: "叙事一致性" },
  { key: "narrativeTension", label: "叙事张力与节奏" },
  { key: "branchStructureQuality", label: "分支结构质量" },
  { key: "choiceDesignQuality", label: "选择设计质量" },
  { key: "consequenceFeedbackQuality", label: "后果与反馈质量" },
  { key: "stateDrivenEffectiveness", label: "状态驱动有效性" }
];

const compareState = {
  uploads: {
    left: [],
    right: []
  },
  pairs: [],
  currentPairIndex: 0,
  scores: [],
  scorePanelCollapsed: false,
  focusedPaneId: null,
  panes: {
    left: createPaneState("left"),
    right: createPaneState("right")
  }
};

function createPaneState(id) {
  return {
    id,
    fileName: "",
    ledger: {},
    nodes: [],
    order: [],
    selectedNodeId: null,
    activeDetailTab: "event",
    expandedNodeIds: [],
    detailCollapsed: false,
    nodePositions: {},
    zoom: 1,
    canvasMetrics: {
      width: 960,
      height: 760
    }
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clampZoom(value) {
  return Math.min(1.8, Math.max(0.5, value));
}

function getScoreFieldName(side, key) {
  return `${side}_${key}`;
}

function renderScoreFormFields() {
  if (!scoreForm) return;
  const sideLabels = {
    left: "对照组",
    right: "实验组"
  };

  scoreForm.innerHTML = scoreDimensions.map(({ key, label }) => `
    <label class="compare-score-field compare-score-field-dual">
      <span>${label}</span>
      <div class="compare-score-dual">
        <label class="compare-score-side">
          <em>${sideLabels.left}</em>
          <select name="${getScoreFieldName("left", key)}" required></select>
        </label>
        <label class="compare-score-side">
          <em>${sideLabels.right}</em>
          <select name="${getScoreFieldName("right", key)}" required></select>
        </label>
      </div>
    </label>
  `).join("");
}

function formatNodeTitle(node) {
  const source = node?.summary || node?.goal || node?.id || "未命名节点";
  return String(source).split(/[，。；;：:]/)[0].trim() || node?.id || "未命名节点";
}

function makeEffectString(entry) {
  if (!entry) return "";
  if (typeof entry === "string") return entry;

  const name = entry.name || entry["变量名"] || "";
  const change = entry.change || entry["变化"] || entry.value || "";
  if (name && change) return `${name} ${change}`;
  return String(change || name || "");
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [value];
}

function normalizeOption(rawOption, index) {
  return {
    id: rawOption?.id || rawOption?.["选项编号"] || `C${index + 1}`,
    text: rawOption?.text || rawOption?.["选项文本"] || rawOption?.title || rawOption?.["选项标题"] || `选项 ${index + 1}`,
    intent: rawOption?.intent || rawOption?.["选项意图"] || rawOption?.description || rawOption?.["结果说明"] || "",
    effects: ensureArray(rawOption?.effects || rawOption?.["状态写入"])
      .map((effect) => makeEffectString(effect))
      .filter(Boolean)
  };
}

function normalizeDecision(rawDecision, index) {
  return {
    id: rawDecision?.id || rawDecision?.["决策点编号"] || `D${index + 1}`,
    title: rawDecision?.title || rawDecision?.["决策点标题"] || rawDecision?.["决策点描述"] || `决策 ${index + 1}`,
    description: rawDecision?.description || rawDecision?.["结果说明"] || "",
    inputType: rawDecision?.inputType || rawDecision?.["输入形式"] || "选择",
    options: ensureArray(rawDecision?.options || rawDecision?.["选项列表"])
      .map((option, optionIndex) => normalizeOption(option, optionIndex))
  };
}

function normalizeJump(rawJump, index) {
  return {
    id: rawJump?.id || rawJump?.["出口编号"] || `J${index + 1}`,
    condition: rawJump?.condition || rawJump?.["条件"] || rawJump?.["条件表达式"] || rawJump?.["条件摘要"] || "默认推进",
    target: rawJump?.target || rawJump?.["目标节点"] || rawJump?.["连接到"] || ""
  };
}

function normalizeNode(rawNode, index) {
  const summary = rawNode?.summary || rawNode?.["事件摘要"] || rawNode?.["事件简介"] || rawNode?.["生成方向"] || "";
  const goal = rawNode?.goal || rawNode?.["节点目标"] || rawNode?.["事件目标"] || "";
  const decisions = ensureArray(rawNode?.decisions || rawNode?.["决策点列表"])
    .map((decision, decisionIndex) => normalizeDecision(decision, decisionIndex));
  const jumps = ensureArray(rawNode?.jumps || rawNode?.["跳转规则"])
    .map((jump, jumpIndex) => normalizeJump(jump, jumpIndex))
    .filter((jump) => jump.target);
  const settlementStateWrites = ensureArray(
    rawNode?.stateWrites || rawNode?.["状态写入"] || rawNode?.["节点结算"]?.["状态写入"]
  );

  return {
    id: rawNode?.id || rawNode?.["节点编号"] || rawNode?.nodeId || `E${index + 1}`,
    title: rawNode?.title || rawNode?.["节点标题"] || formatNodeTitle({ summary, goal, id: rawNode?.id || rawNode?.["节点编号"] }),
    summary,
    goal,
    chapter: rawNode?.chapter || rawNode?.["所属章节"] || rawNode?.chapterName || "",
    act: rawNode?.act || rawNode?.["章内幕次"] || rawNode?.["所属幕内幕次"] || "",
    nodeType: rawNode?.nodeType || rawNode?.["节点类型"] || rawNode?.type || "普通节点",
    endingLine: rawNode?.endingLine || rawNode?.["所属终局线"] || null,
    decisions,
    jumps,
    settlement: rawNode?.settlement || rawNode?.["节点结算"]?.["摘要"] || rawNode?.["结算描述"] || "",
    stateWrites: settlementStateWrites.map((item) => makeEffectString(item)).filter(Boolean)
  };
}

function normalizeLedger(rawLedger) {
  if (!rawLedger || typeof rawLedger !== "object") return {};
  return Object.fromEntries(
    Object.entries(rawLedger).map(([title, items]) => [
      title,
      ensureArray(items).map((item) => ({
        name: item?.name || item?.["变量名"] || "unknown",
        kind: item?.kind || item?.["数值属性"] || "",
        range: item?.range || item?.["数值范围"] || "",
        initial: item?.initial ?? item?.["初始值"] ?? 0,
        note: item?.note || item?.["说明"] || ""
      }))
    ])
  );
}

function extractNodesFromStructure(rawStructure) {
  if (!rawStructure?.chapters) return [];
  return rawStructure.chapters.flatMap((chapter) =>
    (chapter.acts || []).flatMap((act) => act.nodes || [])
  );
}

function normalizeDynamicBundle(raw, fileName) {
  let ledger = {};
  let nodes = [];
  let order = [];

  if (raw?.dynamic && raw?.structure?.chapters) {
    ledger = normalizeLedger(raw.dynamic.ledger);
    nodes = extractNodesFromStructure(raw.structure).map((node, index) => normalizeNode(node, index));
    order = Array.isArray(raw.dynamic.order) ? raw.dynamic.order.slice() : nodes.map((node) => node.id);
  } else if (raw?.["动力层状态账本"] || raw?.["节点运行单元列表"]) {
    ledger = normalizeLedger(raw["动力层状态账本"]);
    nodes = (raw["节点运行单元列表"] || []).map((node, index) => normalizeNode(node, index));
    order = nodes.map((node) => node.id);
  } else if (raw?.dynamic?.nodes || raw?.nodes) {
    ledger = normalizeLedger(raw.dynamic?.ledger || raw.ledger);
    nodes = (raw.dynamic?.nodes || raw.nodes || []).map((node, index) => normalizeNode(node, index));
    order = Array.isArray(raw.dynamic?.order || raw.order) ? (raw.dynamic?.order || raw.order).slice() : nodes.map((node) => node.id);
  } else if (Array.isArray(raw)) {
    nodes = raw.map((node, index) => normalizeNode(node, index));
    order = nodes.map((node) => node.id);
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const normalizedOrder = order.filter((id) => nodeMap.has(id));
  nodes.forEach((node) => {
    if (!normalizedOrder.includes(node.id)) {
      normalizedOrder.push(node.id);
    }
  });

  if (!nodes.length) {
    throw new Error(`文件 ${fileName} 中没有识别到动力层节点`);
  }

  return {
    fileName,
    ledger,
    nodes,
    order: normalizedOrder
  };
}

async function parseFile(file) {
  const text = await file.text();
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(`文件 ${file.name} 不是合法 JSON`);
  }
  return normalizeDynamicBundle(raw, file.name);
}

function renderFileTable(side) {
  const tbody = side === "left" ? leftFilesBody : rightFilesBody;
  const files = compareState.uploads[side];
  tbody.innerHTML = "";

  if (!files.length) {
    tbody.innerHTML = `<tr><td colspan="2" class="compare-empty-row">尚未选择文件</td></tr>`;
    return;
  }

  files.forEach((file, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${index + 1}</td><td>${escapeHtml(file.name)}</td>`;
    tbody.appendChild(row);
  });
}

function updateUploadState() {
  renderFileTable("left");
  renderFileTable("right");

  const leftCount = compareState.uploads.left.length;
  const rightCount = compareState.uploads.right.length;
  const ready = leftCount > 0 && leftCount === rightCount;

  if (!leftCount && !rightCount) {
    uploadHint.textContent = "请上传两组数量相同的 JSON 文件。";
  } else if (ready) {
    uploadHint.textContent = `已就绪：方案 A 与方案 B 各 ${leftCount} 个文件。`;
  } else {
    uploadHint.textContent = `当前数量不一致：方案 A 为 ${leftCount} 个，方案 B 为 ${rightCount} 个。`;
  }

  startButton.disabled = !ready;
}

function setScreen(screen) {
  uploadScreen.classList.toggle("hidden", screen !== "upload");
  workspaceScreen.classList.toggle("hidden", screen !== "workspace");
  finishScreen.classList.toggle("hidden", screen !== "finish");
}

function populateScoreSelects() {
  scoreDimensions.forEach(({ key }) => {
    const select = scoreForm.elements.namedItem(key);
    if (!select) return;
    select.innerHTML = ['<option value="">评分</option>']
      .concat(Array.from({ length: 11 }, (_, value) => `<option value="${value}">${value}</option>`))
      .join("");
  });
}

function resetScoreForm() {
  scoreDimensions.forEach(({ key }) => {
    const select = scoreForm.elements.namedItem(key);
    if (select) select.value = "";
  });
}

function compareNodeId(leftId, rightId) {
  const leftMatch = String(leftId).match(/^([A-Za-z]+)(\d+)$/);
  const rightMatch = String(rightId).match(/^([A-Za-z]+)(\d+)$/);
  if (leftMatch && rightMatch && leftMatch[1] === rightMatch[1]) {
    return Number(leftMatch[2]) - Number(rightMatch[2]);
  }
  return String(leftId).localeCompare(String(rightId), "zh-Hans-CN");
}

function getPaneState(paneId) {
  return compareState.panes[paneId];
}

function getPaneNodes(paneId) {
  const pane = getPaneState(paneId);
  const nodeMap = new Map(pane.nodes.map((node) => [node.id, node]));
  const ordered = pane.order.map((id) => nodeMap.get(id)).filter(Boolean);
  const used = new Set(ordered.map((node) => node.id));
  return [...ordered, ...pane.nodes.filter((node) => !used.has(node.id))];
}

function getPaneSelectedNode(paneId) {
  const pane = getPaneState(paneId);
  const nodes = getPaneNodes(paneId);
  return nodes.find((node) => node.id === pane.selectedNodeId) || nodes[0] || null;
}

function applyCompareWorkspaceLayout() {
  const columns = document.querySelector(".compare-columns");
  if (columns) {
    columns.classList.toggle("is-focused-left", compareState.focusedPaneId === "left");
    columns.classList.toggle("is-focused-right", compareState.focusedPaneId === "right");
  }

  paneIds.forEach((paneId) => {
    const pane = getPaneState(paneId);
    const paneElement = document.querySelector(`.compare-pane[data-pane="${paneId}"]`);
    if (!paneElement) return;

    const collapsedByFocus = Boolean(compareState.focusedPaneId && compareState.focusedPaneId !== paneId);
    paneElement.classList.toggle("is-detail-collapsed", Boolean(pane.detailCollapsed));
    paneElement.classList.toggle("is-collapsed", collapsedByFocus);

    const detailButton = paneElement.querySelector(`[data-pane-detail-toggle="${paneId}"]`);
    if (detailButton) {
      detailButton.textContent = pane.detailCollapsed ? "展开属性栏" : "收起属性栏";
      detailButton.setAttribute("aria-pressed", pane.detailCollapsed ? "true" : "false");
    }

    const focusButton = paneElement.querySelector(`[data-pane-focus-toggle="${paneId}"]`);
    if (focusButton) {
      const focused = compareState.focusedPaneId === paneId;
      focusButton.textContent = focused ? "双栏显示" : "聚焦此侧";
      focusButton.setAttribute("aria-pressed", focused ? "true" : "false");
    }
  });
}

function syncScorePanelState() {
  scoreBody.classList.toggle("hidden", compareState.scorePanelCollapsed);
  scoreToggleButton.textContent = compareState.scorePanelCollapsed ? "展开评分栏" : "收起评分栏";
  if (scorePanel) {
    scorePanel.classList.toggle("is-collapsed", compareState.scorePanelCollapsed);
  }
}

function getPaneEdges(paneId, nodes = getPaneNodes(paneId)) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgeKeys = new Set();

  return nodes.flatMap((node) =>
    (node.jumps || [])
      .filter((jump) => jump?.target && nodeIds.has(jump.target))
      .map((jump) => {
        const key = `${node.id}->${jump.target}`;
        if (edgeKeys.has(key)) return null;
        edgeKeys.add(key);
        return {
          fromId: node.id,
          toId: jump.target,
          type: jump.type || "default",
          condition: jump.condition || ""
        };
      })
      .filter(Boolean)
  );
}

function buildPaneLayout(paneId, nodes = getPaneNodes(paneId)) {
  const pane = getPaneState(paneId);
  const orderIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const edges = getPaneEdges(paneId, nodes);
  const childrenMap = new Map(nodes.map((node) => [node.id, []]));
  const parentsMap = new Map(nodes.map((node) => [node.id, []]));

  edges.forEach((edge) => {
    childrenMap.get(edge.fromId)?.push(edge.toId);
    parentsMap.get(edge.toId)?.push(edge.fromId);
  });

  const depth = new Map();
  nodes.forEach((node) => {
    if (!parentsMap.get(node.id)?.length) {
      depth.set(node.id, 0);
    }
  });

  if (!nodes.length) {
    return { positions: new Map(), width: 960, height: 760 };
  }
  if (!depth.size) {
    depth.set(nodes[0].id, 0);
  }

  nodes.forEach((node) => {
    const baseDepth = depth.get(node.id) ?? 0;
    (childrenMap.get(node.id) || []).forEach((childId) => {
      depth.set(childId, Math.max(depth.get(childId) ?? 0, baseDepth + 1));
    });
  });

  const maxDepth = Math.max(...Array.from(depth.values()));
  const layers = Array.from({ length: maxDepth + 1 }, () => []);
  nodes.forEach((node) => {
    layers[depth.get(node.id) ?? 0].push(node);
  });

  const positions = new Map();
  const topY = 40;
  const rowGap = 220;
  const columnGap = 340;
  const centerX = 520;
  const cardWidth = 320;
  const cardHeight = 196;

  layers.forEach((layer) => {
    const count = layer.length;
    const spread = Math.max(0, (count - 1) * columnGap);
    const startX = centerX - spread / 2;
    layer
      .sort((left, right) => orderIndex.get(left.id) - orderIndex.get(right.id))
      .forEach((node, index) => {
        const stored = pane.nodePositions[node.id];
        const x = stored?.x ?? (count === 1 ? centerX : startX + columnGap * index);
        const y = stored?.y ?? (topY + (depth.get(node.id) ?? 0) * rowGap);
        positions.set(node.id, { x, y });
        pane.nodePositions[node.id] = { x, y };
      });
  });

  const maxX = Math.max(...Array.from(positions.values()).map((item) => item.x));
  const maxY = Math.max(...Array.from(positions.values()).map((item) => item.y));

  return {
    positions,
    width: Math.max(940, maxX + cardWidth / 2 + 120),
    height: Math.max(720, maxY + cardHeight + 120)
  };
}

function syncPaneCanvasBounds(paneId, timeline, fallback = {}) {
  const pane = getPaneState(paneId);
  const entries = Array.from(timeline.querySelectorAll(".dynamic-card-entry"));
  const baseWidth = Math.max(fallback.width || 0, timeline.parentElement?.clientWidth || 0, timeline.clientWidth || 0, 960);
  let maxWidth = baseWidth;
  let maxHeight = Math.max(fallback.height || 0, 760);

  entries.forEach((entry) => {
    const x = parseFloat(entry.style.left) || 0;
    const y = parseFloat(entry.style.top) || 0;
    const width = entry.offsetWidth || 0;
    const height = entry.offsetHeight || 0;
    maxWidth = Math.max(maxWidth, x + width / 2 + 80);
    maxHeight = Math.max(maxHeight, y + height + 80);
  });

  timeline.style.width = `${maxWidth}px`;
  timeline.style.minWidth = `${maxWidth}px`;
  timeline.style.minHeight = `${maxHeight}px`;
  timeline.style.height = `${maxHeight}px`;
  pane.canvasMetrics = { width: maxWidth, height: maxHeight };
  return pane.canvasMetrics;
}

function applyPaneZoom(paneId, metrics = getPaneState(paneId).canvasMetrics) {
  const pane = getPaneState(paneId);
  const base = document.getElementById(`compare-${paneId}-base`);
  const scene = document.getElementById(`compare-${paneId}-viewport`)?.querySelector(".canvas-scene");
  const label = document.getElementById(`compare-${paneId}-zoom-label`);
  if (!base || !scene) return;

  pane.zoom = clampZoom(pane.zoom);
  const width = Math.max(metrics?.width || 0, 1);
  const height = Math.max(metrics?.height || 0, 1);
  base.style.width = `${width}px`;
  base.style.height = `${height}px`;
  base.style.transform = `scale(${pane.zoom})`;
  scene.style.width = `${width * pane.zoom}px`;
  scene.style.height = `${height * pane.zoom}px`;
  if (label) {
    label.textContent = `${Math.round(pane.zoom * 100)}%`;
  }
}

function changePaneZoom(paneId, delta) {
  const pane = getPaneState(paneId);
  pane.zoom = clampZoom(pane.zoom + delta);
  applyPaneZoom(paneId);
}

function zoomPaneAtPoint(paneId, nextZoom, clientX, clientY) {
  const pane = getPaneState(paneId);
  const viewport = document.getElementById(`compare-${paneId}-viewport`);
  if (!viewport) return;

  const oldZoom = pane.zoom || 1;
  const targetZoom = clampZoom(nextZoom);
  if (targetZoom === oldZoom) return;

  const rect = viewport.getBoundingClientRect();
  const anchorX = clientX - rect.left;
  const anchorY = clientY - rect.top;
  const contentX = (viewport.scrollLeft + anchorX) / oldZoom;
  const contentY = (viewport.scrollTop + anchorY) / oldZoom;

  pane.zoom = targetZoom;
  applyPaneZoom(paneId);

  viewport.scrollLeft = Math.max(0, contentX * targetZoom - anchorX);
  viewport.scrollTop = Math.max(0, contentY * targetZoom - anchorY);
}

function resetPaneZoom(paneId) {
  const pane = getPaneState(paneId);
  pane.zoom = 1;
  applyPaneZoom(paneId);
}

function togglePaneDetail(paneId) {
  const pane = getPaneState(paneId);
  pane.detailCollapsed = !pane.detailCollapsed;
  applyCompareWorkspaceLayout();
}

function togglePaneFocus(paneId) {
  compareState.focusedPaneId = compareState.focusedPaneId === paneId ? null : paneId;
  applyCompareWorkspaceLayout();
}

function togglePaneExpanded(paneId, nodeId) {
  const pane = getPaneState(paneId);
  if (pane.expandedNodeIds.includes(nodeId)) {
    pane.expandedNodeIds = pane.expandedNodeIds.filter((id) => id !== nodeId);
  } else {
    pane.expandedNodeIds = [...pane.expandedNodeIds, nodeId];
  }
}

function isPaneExpanded(paneId, nodeId) {
  return getPaneState(paneId).expandedNodeIds.includes(nodeId);
}

function renderPaneConnections(paneId, timeline, nodes, bounds = syncPaneCanvasBounds(paneId, timeline)) {
  const existing = timeline.querySelector(".dynamic-links");
  if (existing) existing.remove();

  const edges = getPaneEdges(paneId, nodes);
  if (!edges.length) return;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "dynamic-links");
  svg.setAttribute("width", `${bounds.width}`);
  svg.setAttribute("height", `${bounds.height}`);
  svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
  svg.setAttribute("preserveAspectRatio", "none");

  edges.forEach((edge) => {
    const fromEntry = timeline.querySelector(`[data-node-id="${edge.fromId}"]`);
    const toEntry = timeline.querySelector(`[data-node-id="${edge.toId}"]`);
    if (!fromEntry || !toEntry) return;

    const fromCard = fromEntry.querySelector(".dynamic-card");
    const toCard = toEntry.querySelector(".dynamic-card");
    if (!fromCard || !toCard) return;

    const startX = parseFloat(fromEntry.style.left) || 0;
    const startY = (parseFloat(fromEntry.style.top) || 0) + fromCard.offsetHeight;
    const endX = parseFloat(toEntry.style.left) || 0;
    const endY = parseFloat(toEntry.style.top) || 0;
    const verticalGap = Math.max(120, Math.abs(endY - startY) * 0.45);
    const control1X = startX;
    const control1Y = startY + verticalGap;
    const control2X = endX;
    const control2Y = endY - verticalGap;

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute(
      "d",
      `M${startX} ${startY} C${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`
    );
    path.setAttribute("class", "dynamic-edge");
    svg.appendChild(path);
  });

  timeline.prepend(svg);
}

function bindPaneDrag(paneId, entry, nodeId, timeline, nodes) {
  const pane = getPaneState(paneId);
  const handle = entry.querySelector(".dynamic-card");
  if (!handle) return;

  let dragState = null;

  const finishDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const moved = dragState.moved;
    dragState = null;
    handle.classList.remove("is-dragging");
    try {
      handle.releasePointerCapture(event.pointerId);
    } catch (error) {
      // ignore
    }
    if (!moved) {
      pane.selectedNodeId = nodeId;
      renderPane(paneId);
    }
  };

  handle.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".dynamic-toggle")) return;
    dragState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: parseFloat(entry.style.left) || 0,
      originY: parseFloat(entry.style.top) || 0,
      moved: false
    };
    handle.classList.add("is-dragging");
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  handle.addEventListener("pointermove", (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragState.startClientX;
    const dy = event.clientY - dragState.startClientY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragState.moved = true;
    }

    const x = Math.max(160, dragState.originX + dx);
    const y = Math.max(20, dragState.originY + dy);
    entry.style.left = `${x}px`;
    entry.style.top = `${y}px`;
    pane.nodePositions[nodeId] = { x, y };

    const bounds = syncPaneCanvasBounds(paneId, timeline);
    applyPaneZoom(paneId, bounds);
    renderPaneConnections(paneId, timeline, nodes, bounds);
  });

  handle.addEventListener("pointerup", finishDrag);
  handle.addEventListener("pointercancel", finishDrag);
}

function renderPaneDetail(paneId) {
  const pane = getPaneState(paneId);
  const node = getPaneSelectedNode(paneId);
  const content = document.getElementById(`compare-${paneId}-detail`);
  if (!content) return;

  const buttons = Array.from(document.querySelectorAll(`[data-pane-tab="${paneId}"]`));
  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === pane.activeDetailTab);
  });

  if (!node) {
    content.innerHTML = "";
    return;
  }

  if (pane.activeDetailTab === "event") {
    const stateWrites = node.stateWrites.length
      ? `<h4>状态写入</h4><p>${node.stateWrites.map((item) => escapeHtml(item)).join("<br>")}</p>`
      : "";
    content.innerHTML = `
      <div class="detail-block">
        <div class="detail-card">
          <h4>节点编号</h4>
          <p>${escapeHtml(node.id)}</p>
          <h4>节点标题</h4>
          <p>${escapeHtml(node.title)}</p>
          <h4>所属章节 / 幕次</h4>
          <p>${escapeHtml(node.chapter || "-")} / ${escapeHtml(node.act || "-")}</p>
          <h4>节点类型</h4>
          <p>${escapeHtml(node.nodeType || "普通节点")}${node.endingLine ? ` / ${escapeHtml(node.endingLine)}` : ""}</p>
          <h4>事件简介</h4>
          <p>${escapeHtml(node.summary || "")}</p>
          <h4>事件目标</h4>
          <p>${escapeHtml(node.goal || "")}</p>
          ${stateWrites}
        </div>
      </div>
    `;
    return;
  }

  if (pane.activeDetailTab === "decision") {
    const html = (node.decisions || []).map((decision) => {
      const optionsHtml = decision.options.map((option) => `
        <div class="detail-option-block">
          <h5>${escapeHtml(option.id)} ${escapeHtml(option.text)}</h5>
          <p>${escapeHtml(option.intent || "")}</p>
          <p><strong>状态变化：</strong>${option.effects.length ? escapeHtml(option.effects.join(" / ")) : "无"}</p>
        </div>
      `).join("");

      return `
        <div class="detail-card">
          <h4>${escapeHtml(decision.id)} ${escapeHtml(decision.title)}</h4>
          <p>${escapeHtml(decision.description || "")}</p>
          <p><strong>输入形式：</strong>${escapeHtml(decision.inputType || "选择")}</p>
          ${optionsHtml || "<p>当前节点没有决策选项定义。</p>"}
        </div>
      `;
    }).join("");

    content.innerHTML = `<div class="detail-block">${html || '<div class="detail-card"><p>当前节点没有决策定义。</p></div>'}</div>`;
    return;
  }

  const jumpHtml = (node.jumps || []).map((jump) => `
    <div class="detail-card">
      <h4>${escapeHtml(jump.id)}</h4>
      <p><strong>条件：</strong>${escapeHtml(jump.condition || "默认推进")}</p>
      <p><strong>目标节点：</strong>${escapeHtml(jump.target || "-")}</p>
    </div>
  `).join("");
  content.innerHTML = `<div class="detail-block">${jumpHtml || '<div class="detail-card"><p>当前节点没有跳转定义。</p></div>'}</div>`;
}

function renderPane(paneId) {
  const pane = getPaneState(paneId);
  const timeline = document.getElementById(`compare-${paneId}-timeline`);
  const title = document.getElementById(`compare-${paneId}-title`);
  if (!timeline || !title) return;

  title.textContent = pane.fileName || "未载入文件";
  timeline.innerHTML = "";

  const nodes = getPaneNodes(paneId);
  if (!nodes.length) {
    renderPaneDetail(paneId);
    return;
  }

  if (!pane.selectedNodeId || !nodes.some((node) => node.id === pane.selectedNodeId)) {
    pane.selectedNodeId = nodes[0].id;
  }

  const layout = buildPaneLayout(paneId, nodes);

  nodes.forEach((node) => {
    const expanded = isPaneExpanded(paneId, node.id);
    const position = layout.positions.get(node.id) || { x: 220, y: 40 };
    const entry = document.createElement("section");
    entry.className = `timeline-entry dynamic-card-entry${node.id === pane.selectedNodeId ? " is-active" : ""}`;
    entry.dataset.nodeId = node.id;
    entry.style.left = `${position.x}px`;
    entry.style.top = `${position.y}px`;

    const decisionList = node.decisions.length
      ? node.decisions.map((decision) => `${escapeHtml(decision.id)} ${escapeHtml(decision.title)}`).join("<br>")
      : "无";
    const jumpList = node.jumps.length
      ? node.jumps.map((jump) => `${escapeHtml(jump.id)} -> ${escapeHtml(jump.target)}`).join("<br>")
      : "无";

    entry.innerHTML = `
      <article class="timeline-node dynamic-card${expanded ? " expanded" : ""}${node.id === pane.selectedNodeId ? " active" : ""}">
        <div class="timeline-node-head dynamic-card-head">
          <div class="dynamic-card-head-main">
            <span class="dynamic-card-grip" aria-hidden="true">::</span>
            <span class="timeline-node-title">${escapeHtml(node.id)} ${escapeHtml(node.title)}</span>
          </div>
          <button class="dynamic-toggle" type="button" aria-label="toggle">
            ${expanded ? "-" : "+"}
          </button>
        </div>
        <div class="timeline-node-summary">${escapeHtml(node.summary || "")}</div>
        <div class="timeline-node-body${expanded ? "" : " hidden"}">
          <div><strong>事件目标</strong></div>
          <div>${escapeHtml(node.goal || "")}</div>
          <div><strong>决策点</strong></div>
          <div>${decisionList}</div>
          <div><strong>跳转</strong></div>
          <div>${jumpList}</div>
        </div>
      </article>
    `;

    const toggle = entry.querySelector(".dynamic-toggle");
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      pane.selectedNodeId = node.id;
      togglePaneExpanded(paneId, node.id);
      renderPane(paneId);
    });

    const card = entry.querySelector(".dynamic-card");
    card.addEventListener("click", () => {
      pane.selectedNodeId = node.id;
      renderPane(paneId);
    });

    bindPaneDrag(paneId, entry, node.id, timeline, nodes);
    timeline.appendChild(entry);
  });

  const bounds = syncPaneCanvasBounds(paneId, timeline, layout);
  applyPaneZoom(paneId, bounds);
  renderPaneConnections(paneId, timeline, nodes, bounds);
  renderPaneDetail(paneId);
}

function loadPairIntoPane(paneId, bundle) {
  const previousPane = getPaneState(paneId);
  compareState.panes[paneId] = {
    ...createPaneState(paneId),
    detailCollapsed: previousPane?.detailCollapsed ?? false,
    zoom: previousPane?.zoom ?? 1,
    fileName: bundle.fileName,
    ledger: bundle.ledger,
    nodes: bundle.nodes.slice(),
    order: bundle.order.slice(),
    selectedNodeId: bundle.order[0] || bundle.nodes[0]?.id || null
  };
}

function renderCurrentPair() {
  const pair = compareState.pairs[compareState.currentPairIndex];
  if (!pair) return;

  loadPairIntoPane("left", pair.left);
  loadPairIntoPane("right", pair.right);

  progressTitle.textContent = `第 ${compareState.currentPairIndex + 1} / ${compareState.pairs.length} 组对比`;
  progressSubtitle.textContent = `${pair.left.fileName}  vs  ${pair.right.fileName}`;
  submitScoreButton.textContent = compareState.currentPairIndex === compareState.pairs.length - 1
    ? "提交评分并完成对比"
    : "提交评分并进入下一组";

  resetScoreForm();
  renderPane("left");
  renderPane("right");
  bindViewportPan("left");
  bindViewportPan("right");
  bindViewportWheelZoom("left");
  bindViewportWheelZoom("right");
  const leftViewport = document.getElementById("compare-left-viewport");
  const rightViewport = document.getElementById("compare-right-viewport");
  if (leftViewport) {
    leftViewport.scrollLeft = 0;
    leftViewport.scrollTop = 0;
  }
  if (rightViewport) {
    rightViewport.scrollLeft = 0;
    rightViewport.scrollTop = 0;
  }
  applyCompareWorkspaceLayout();
}

function toggleScorePanel() {
  compareState.scorePanelCollapsed = !compareState.scorePanelCollapsed;
  syncScorePanelState();
}

function readScoreValues() {
  const values = {};
  for (const dimension of scoreDimensions) {
    const value = scoreForm.elements.namedItem(dimension.key)?.value ?? "";
    if (value === "") {
      throw new Error(`请先完成“${dimension.label}”评分`);
    }
    values[dimension.key] = Number(value);
  }
  return values;
}

function renderResultsSummary() {
  resultsSummary.innerHTML = "";
  compareState.scores.forEach((record, index) => {
    const row = document.createElement("section");
    row.className = "compare-result-row";
    row.innerHTML = `
      <h4>第 ${index + 1} 组：${escapeHtml(record.leftFile)} vs ${escapeHtml(record.rightFile)}</h4>
      ${scoreDimensions.map((dimension) => `<p>${dimension.label}：${record.scores[dimension.key]}</p>`).join("")}
    `;
    resultsSummary.appendChild(row);
  });
}

function buildResultsPayload() {
  return {
    generatedAt: new Date().toISOString(),
    totalPairs: compareState.scores.length,
    results: compareState.scores
  };
}

function formatCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildResultsTableRows() {
  return compareState.scores.map((record) => {
    const leftAverage = scoreDimensions.reduce((sum, dimension) => sum + (record.scores.left?.[dimension.key] ?? 0), 0) / scoreDimensions.length;
    const rightAverage = scoreDimensions.reduce((sum, dimension) => sum + (record.scores.right?.[dimension.key] ?? 0), 0) / scoreDimensions.length;
    const row = {
      pairIndex: record.pairIndex,
      leftFile: record.leftFile,
      rightFile: record.rightFile
    };

    scoreDimensions.forEach((dimension) => {
      row[`left_${dimension.key}`] = record.scores.left?.[dimension.key] ?? "";
      row[`right_${dimension.key}`] = record.scores.right?.[dimension.key] ?? "";
    });

    row.leftAverage = leftAverage.toFixed(2);
    row.rightAverage = rightAverage.toFixed(2);
    return row;
  });
}

function buildResultsCsv() {
  const headers = [
    "组次",
    "对照组文件",
    "实验组文件",
    ...scoreDimensions.flatMap((dimension) => [
      `对照组-${dimension.label}`,
      `实验组-${dimension.label}`
    ]),
    "对照组平均分",
    "实验组平均分"
  ];
  const rows = buildResultsTableRows();
  const csvLines = [
    headers.map(formatCsvCell).join(","),
    ...rows.map((row) => {
      const values = [
        row.pairIndex,
        row.leftFile,
        row.rightFile,
        ...scoreDimensions.flatMap((dimension) => [
          row[`left_${dimension.key}`],
          row[`right_${dimension.key}`]
        ]),
        row.leftAverage,
        row.rightAverage
      ];
      return values.map(formatCsvCell).join(",");
    })
  ];
  return `\uFEFF${csvLines.join("\r\n")}`;
}

function downloadResults() {
  if (!compareState.scores.length) {
    alert("还没有已提交的评分可导出。");
    return;
  }

  const blob = new Blob([buildResultsCsv()], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dynamic-compare-results-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function startComparison() {
  startButton.disabled = true;
  startButton.textContent = "解析文件中...";

  try {
    const [leftBundles, rightBundles] = await Promise.all([
      Promise.all(compareState.uploads.left.map((file) => parseFile(file))),
      Promise.all(compareState.uploads.right.map((file) => parseFile(file)))
    ]);

    compareState.pairs = leftBundles.map((left, index) => ({
      left,
      right: rightBundles[index]
    }));
    compareState.currentPairIndex = 0;
    compareState.scores = [];
    compareState.scorePanelCollapsed = false;
    compareState.focusedPaneId = null;
    syncScorePanelState();

    setScreen("workspace");
    renderCurrentPair();
  } catch (error) {
    alert(error.message);
  } finally {
    startButton.textContent = "开始对比";
    updateUploadState();
  }
}

function submitCurrentScore() {
  try {
    const pair = compareState.pairs[compareState.currentPairIndex];
    const scores = readScoreValues();
    compareState.scores.push({
      pairIndex: compareState.currentPairIndex + 1,
      leftFile: pair.left.fileName,
      rightFile: pair.right.fileName,
      scores
    });

    if (compareState.currentPairIndex < compareState.pairs.length - 1) {
      compareState.currentPairIndex += 1;
      renderCurrentPair();
      return;
    }

    renderResultsSummary();
    setScreen("finish");
  } catch (error) {
    alert(error.message);
  }
}

function resetAll() {
  compareState.uploads.left = [];
  compareState.uploads.right = [];
  compareState.pairs = [];
  compareState.currentPairIndex = 0;
  compareState.scores = [];
  compareState.scorePanelCollapsed = false;
  compareState.focusedPaneId = null;
  compareState.panes.left = createPaneState("left");
  compareState.panes.right = createPaneState("right");
  leftInput.value = "";
  rightInput.value = "";
  updateUploadState();
  syncScorePanelState();
  applyCompareWorkspaceLayout();
  setScreen("upload");
}

function bindEvents() {
  leftInput.addEventListener("change", () => {
    compareState.uploads.left = Array.from(leftInput.files || []);
    updateUploadState();
  });

  rightInput.addEventListener("change", () => {
    compareState.uploads.right = Array.from(rightInput.files || []);
    updateUploadState();
  });

  startButton.addEventListener("click", startComparison);
  scoreToggleButton.addEventListener("click", toggleScorePanel);
  submitScoreButton.addEventListener("click", submitCurrentScore);
  exportProgressButton?.addEventListener("click", downloadResults);
  restartButton.addEventListener("click", resetAll);
  downloadResultsButton.addEventListener("click", downloadResults);

  document.addEventListener("click", (event) => {
    const detailToggleButton = event.target.closest("[data-pane-detail-toggle]");
    if (detailToggleButton) {
      togglePaneDetail(detailToggleButton.dataset.paneDetailToggle);
      return;
    }

    const focusToggleButton = event.target.closest("[data-pane-focus-toggle]");
    if (focusToggleButton) {
      togglePaneFocus(focusToggleButton.dataset.paneFocusToggle);
      return;
    }

    const tabButton = event.target.closest("[data-pane-tab]");
    if (tabButton) {
      const paneId = tabButton.dataset.paneTab;
      const pane = getPaneState(paneId);
      pane.activeDetailTab = tabButton.dataset.tab || "event";
      renderPaneDetail(paneId);
      return;
    }

    const zoomButton = event.target.closest("[data-pane-zoom]");
    if (zoomButton) {
      const paneId = zoomButton.dataset.paneZoom;
      const action = zoomButton.dataset.zoomAction;
      if (action === "in") changePaneZoom(paneId, 0.1);
      if (action === "out") changePaneZoom(paneId, -0.1);
      if (action === "reset") resetPaneZoom(paneId);
    }
  });
}

function decodeZipText(bytes) {
  return new TextDecoder("utf-8").decode(bytes);
}

async function inflateZipEntry(bytes) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("当前浏览器环境不支持 XLSX 解压");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzipXlsxEntries(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const minOffset = Math.max(0, bytes.length - 0xffff - 22);
  let eocdOffset = -1;

  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("无法读取 XLSX 压缩目录");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map();
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error("XLSX 中央目录结构异常");
    }

    const compression = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);
    const fileName = decodeZipText(bytes.slice(cursor + 46, cursor + 46 + fileNameLength));

    const localFileNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedBytes = bytes.slice(dataStart, dataStart + compressedSize);

    let contentBytes;
    if (compression === 0) {
      contentBytes = compressedBytes;
    } else if (compression === 8) {
      contentBytes = await inflateZipEntry(compressedBytes);
    } else {
      throw new Error(`XLSX 中存在不支持的压缩方式: ${compression}`);
    }

    entries.set(fileName, contentBytes);
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function parseXmlDocument(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("XLSX XML 解析失败");
  }
  return doc;
}

function getInlineXmlText(node) {
  return Array.from(node?.getElementsByTagName("t") || [])
    .map((item) => item.textContent || "")
    .join("");
}

function resolveWorkbookSheetTargets(entries) {
  const workbookXml = entries.get("xl/workbook.xml");
  const relsXml = entries.get("xl/_rels/workbook.xml.rels");
  if (!workbookXml || !relsXml) {
    throw new Error("XLSX 缺少 workbook.xml 或关系文件");
  }

  const workbookDoc = parseXmlDocument(decodeZipText(workbookXml));
  const relsDoc = parseXmlDocument(decodeZipText(relsXml));
  const relationMap = new Map(
    Array.from(relsDoc.getElementsByTagName("Relationship")).map((relation) => [
      relation.getAttribute("Id"),
      relation.getAttribute("Target")
    ])
  );

  return Array.from(workbookDoc.getElementsByTagName("sheet")).map((sheet, index) => {
    const relId = sheet.getAttribute("r:id");
    const target = relationMap.get(relId) || `worksheets/sheet${index + 1}.xml`;
    const normalizedTarget = String(target || "")
      .replace(/^\/+/, "")
      .replace(/\\/g, "/");
    return {
      name: sheet.getAttribute("name") || `Sheet${index + 1}`,
      path: normalizedTarget.startsWith("xl/") ? normalizedTarget : `xl/${normalizedTarget}`
    };
  });
}

function readSharedStrings(entries) {
  const sharedXml = entries.get("xl/sharedStrings.xml");
  if (!sharedXml) return [];

  const sharedDoc = parseXmlDocument(decodeZipText(sharedXml));
  return Array.from(sharedDoc.getElementsByTagName("si")).map((item) => getInlineXmlText(item));
}

function getCellColumnIndex(reference = "") {
  const column = String(reference).match(/[A-Z]+/i)?.[0] || "";
  return column.split("").reduce((value, char) => value * 26 + (char.toUpperCase().charCodeAt(0) - 64), 0);
}

function parseSheetRows(sheetDoc, sharedStrings) {
  return Array.from(sheetDoc.getElementsByTagName("row")).map((rowNode, rowIndex) => {
    const cells = Array.from(rowNode.childNodes || [])
      .filter((node) => node.nodeType === 1 && node.localName === "c")
      .map((cellNode) => {
        const ref = cellNode.getAttribute("r") || "";
        const type = cellNode.getAttribute("t") || "";
        let value = "";

        if (type === "inlineStr") {
          value = getInlineXmlText(cellNode);
        } else if (type === "s") {
          const sharedIndex = Number(cellNode.getElementsByTagName("v")[0]?.textContent || "");
          value = Number.isFinite(sharedIndex) ? (sharedStrings[sharedIndex] || "") : "";
        } else {
          value = cellNode.getElementsByTagName("v")[0]?.textContent || "";
        }

        return {
          ref,
          colIndex: getCellColumnIndex(ref),
          value: String(value ?? "").trim()
        };
      })
      .filter((cell) => cell.value !== "")
      .sort((left, right) => left.colIndex - right.colIndex);

    return {
      index: Number(rowNode.getAttribute("r")) || rowIndex + 1,
      cells
    };
  }).filter((row) => row.cells.length);
}

function tryParseJsonText(text) {
  const normalized = String(text || "").trim();
  if (!normalized || !/^[\[{]/.test(normalized)) {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch (error) {
    return null;
  }
}

function buildXlsxBundleLabel(fileName, sheetName, row, jsonCell) {
  const labelCell = row.cells.find((cell) => cell.ref !== jsonCell.ref && !tryParseJsonText(cell.value) && cell.value.length <= 80);
  return `${fileName} / ${labelCell?.value || `${sheetName}-${jsonCell.ref}`}`;
}

async function parseXlsxFile(file) {
  const entries = await unzipXlsxEntries(await file.arrayBuffer());
  const sharedStrings = readSharedStrings(entries);
  const sheets = resolveWorkbookSheetTargets(entries);
  const bundles = [];

  sheets.forEach((sheet) => {
    const sheetBytes = entries.get(sheet.path);
    if (!sheetBytes) return;

    const rows = parseSheetRows(parseXmlDocument(decodeZipText(sheetBytes)), sharedStrings);
    rows.forEach((row) => {
      row.cells.forEach((cell) => {
        const raw = tryParseJsonText(cell.value);
        if (!raw) return;
        bundles.push(normalizeDynamicBundle(raw, buildXlsxBundleLabel(file.name, sheet.name, row, cell)));
      });
    });
  });

  if (!bundles.length) {
    throw new Error(`文件 ${file.name} 中没有识别到可用 JSON。请确认 Excel 单元格里存放的是完整 JSON 文本。`);
  }

  return bundles;
}

async function parseFile(file) {
  if (/\.xlsx$/i.test(file.name)) {
    return parseXlsxFile(file);
  }

  const text = await file.text();
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(`文件 ${file.name} 不是合法 JSON`);
  }
  return [normalizeDynamicBundle(raw, file.name)];
}

function updateUploadState() {
  renderFileTable("left");
  renderFileTable("right");

  const leftCount = compareState.uploads.left.length;
  const rightCount = compareState.uploads.right.length;
  const ready = leftCount > 0 && leftCount === rightCount;

  if (!leftCount && !rightCount) {
    uploadHint.textContent = "请上传两组数量相同的 JSON 或 XLSX 文件。";
  } else if (ready) {
    uploadHint.textContent = `已就绪：方案 A 与方案 B 各 ${leftCount} 个文件。XLSX 会自动提取其中的 JSON 样本。`;
  } else {
    uploadHint.textContent = `当前文件数量不一致：方案 A ${leftCount} 个，方案 B ${rightCount} 个。`;
  }

  startButton.disabled = !ready;
}

async function startComparison() {
  startButton.disabled = true;
  startButton.textContent = "解析文件中...";

  try {
    const [leftBundleGroups, rightBundleGroups] = await Promise.all([
      Promise.all(compareState.uploads.left.map((file) => parseFile(file))),
      Promise.all(compareState.uploads.right.map((file) => parseFile(file)))
    ]);

    const leftBundles = leftBundleGroups.flat();
    const rightBundles = rightBundleGroups.flat();

    if (!leftBundles.length || !rightBundles.length) {
      throw new Error("没有解析出可用于对比的动力层样本");
    }
    if (leftBundles.length !== rightBundles.length) {
      throw new Error(`解析后样本数量不一致：方案 A 共 ${leftBundles.length} 个，方案 B 共 ${rightBundles.length} 个。请检查 Excel 中 JSON 条数是否一致。`);
    }

    compareState.pairs = leftBundles.map((left, index) => ({
      left,
      right: rightBundles[index]
    }));
    compareState.currentPairIndex = 0;
    compareState.scores = [];
    compareState.scorePanelCollapsed = false;
    compareState.focusedPaneId = null;
    syncScorePanelState();

    setScreen("workspace");
    renderCurrentPair();
  } catch (error) {
    alert(error.message);
  } finally {
    startButton.textContent = "开始对比";
    updateUploadState();
  }
}

function populateScoreSelects() {
  ["left", "right"].forEach((side) => {
    scoreDimensions.forEach(({ key }) => {
      const select = scoreForm.elements.namedItem(getScoreFieldName(side, key));
      if (!select) return;
      select.innerHTML = ['<option value="">评分</option>']
        .concat(Array.from({ length: 11 }, (_, value) => `<option value="${value}">${value}</option>`))
        .join("");
    });
  });
}

function resetScoreForm() {
  ["left", "right"].forEach((side) => {
    scoreDimensions.forEach(({ key }) => {
      const select = scoreForm.elements.namedItem(getScoreFieldName(side, key));
      if (select) select.value = "";
    });
  });
}

function readScoreValues() {
  const values = {
    left: {},
    right: {}
  };

  for (const side of ["left", "right"]) {
    for (const dimension of scoreDimensions) {
      const value = scoreForm.elements.namedItem(getScoreFieldName(side, dimension.key))?.value ?? "";
      if (value === "") {
        const sideLabel = side === "left" ? "对照组" : "实验组";
        throw new Error(`请先完成“${dimension.label} / ${sideLabel}”评分`);
      }
      values[side][dimension.key] = Number(value);
    }
  }

  return values;
}

function renderResultsSummary() {
  resultsSummary.innerHTML = "";
  compareState.scores.forEach((record, index) => {
    const row = document.createElement("section");
    row.className = "compare-result-row";
    row.innerHTML = `
      <h4>第 ${index + 1} 组：${escapeHtml(record.leftFile)} vs ${escapeHtml(record.rightFile)}</h4>
      ${scoreDimensions.map((dimension) => `<p>${dimension.label}：对照组 ${record.scores.left[dimension.key]} / 实验组 ${record.scores.right[dimension.key]}</p>`).join("")}
    `;
    resultsSummary.appendChild(row);
  });
}

function buildPaneLayout(paneId, nodes = getPaneNodes(paneId)) {
  const pane = getPaneState(paneId);
  if (!nodes.length) {
    return { positions: new Map(), width: 1200, height: 860 };
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const orderIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const edges = getPaneEdges(paneId, nodes);
  const childrenMap = new Map(nodes.map((node) => [node.id, []]));
  const parentsMap = new Map(nodes.map((node) => [node.id, []]));
  const sortIds = (ids) => ids.slice().sort((leftId, rightId) => {
    const idOrder = compareNodeId(leftId, rightId);
    return idOrder || ((orderIndex.get(leftId) ?? 0) - (orderIndex.get(rightId) ?? 0));
  });

  edges.forEach((edge) => {
    if (!nodeIds.has(edge.fromId) || !nodeIds.has(edge.toId)) return;
    childrenMap.get(edge.fromId)?.push(edge.toId);
    parentsMap.get(edge.toId)?.push(edge.fromId);
  });

  for (const [nodeId, childIds] of childrenMap.entries()) {
    childrenMap.set(nodeId, sortIds(childIds));
  }
  for (const [nodeId, parentIds] of parentsMap.entries()) {
    parentsMap.set(nodeId, sortIds(parentIds));
  }

  const roots = sortIds(
    nodes
      .filter((node) => !(parentsMap.get(node.id) || []).length)
      .map((node) => node.id)
  );
  if (!roots.length) {
    roots.push(nodes[0].id);
  }

  const depth = new Map();
  const depthQueue = [];
  roots.forEach((nodeId) => {
    depth.set(nodeId, 0);
    depthQueue.push(nodeId);
  });

  while (depthQueue.length) {
    const currentId = depthQueue.shift();
    const currentDepth = depth.get(currentId) ?? 0;
    (childrenMap.get(currentId) || []).forEach((childId) => {
      const nextDepth = currentDepth + 1;
      if (!depth.has(childId) || nextDepth < (depth.get(childId) ?? Number.POSITIVE_INFINITY)) {
        depth.set(childId, nextDepth);
        depthQueue.push(childId);
      }
    });
  }

  nodes.forEach((node) => {
    if (!depth.has(node.id)) {
      const knownParentDepths = (parentsMap.get(node.id) || [])
        .map((parentId) => depth.get(parentId))
        .filter(Number.isFinite);
      depth.set(node.id, knownParentDepths.length ? Math.max(...knownParentDepths) + 1 : 0);
    }
  });

  const layers = new Map();
  nodes.forEach((node) => {
    const layerDepth = depth.get(node.id) ?? 0;
    const layerNodes = layers.get(layerDepth) || [];
    layerNodes.push(node.id);
    layers.set(layerDepth, layerNodes);
  });

  const layerDepths = Array.from(layers.keys()).sort((left, right) => left - right);
  const minCenterGap = 340;
  const topY = 72;
  const rowGap = 400;
  const sidePadding = 180;
  const cardWidth = 280;
  const cardHeight = 196;
  const computedX = new Map();

  function packLayer(nodeIdsInLayer, desiredById) {
    const sortedIds = nodeIdsInLayer.slice().sort((leftId, rightId) => {
      const desiredDiff = (desiredById.get(leftId) ?? 0) - (desiredById.get(rightId) ?? 0);
      if (Math.abs(desiredDiff) > 0.001) return desiredDiff;
      return compareNodeId(leftId, rightId) || ((orderIndex.get(leftId) ?? 0) - (orderIndex.get(rightId) ?? 0));
    });

    const packed = new Map();
    let cursor = null;
    sortedIds.forEach((nodeId, index) => {
      const desired = desiredById.get(nodeId) ?? (index * minCenterGap);
      const x = cursor == null ? desired : Math.max(desired, cursor + minCenterGap);
      packed.set(nodeId, x);
      cursor = x;
    });

    if (sortedIds.length > 1) {
      const desiredCenter = sortedIds.reduce((sum, nodeId) => sum + (desiredById.get(nodeId) ?? 0), 0) / sortedIds.length;
      const actualCenter = sortedIds.reduce((sum, nodeId) => sum + (packed.get(nodeId) ?? 0), 0) / sortedIds.length;
      const shift = desiredCenter - actualCenter;
      sortedIds.forEach((nodeId) => {
        packed.set(nodeId, (packed.get(nodeId) ?? 0) + shift);
      });
    }

    return packed;
  }

  const rootDesired = new Map();
  roots.forEach((nodeId, index) => {
    rootDesired.set(nodeId, index * minCenterGap);
  });
  const packedRoots = packLayer(roots, rootDesired);
  packedRoots.forEach((x, nodeId) => computedX.set(nodeId, x));

  layerDepths
    .filter((layerDepth) => layerDepth > 0)
    .forEach((layerDepth) => {
      const layerIds = sortIds(layers.get(layerDepth) || []);
      const desiredById = new Map();
      layerIds.forEach((nodeId, index) => {
        const parentXs = (parentsMap.get(nodeId) || [])
          .map((parentId) => computedX.get(parentId))
          .filter((value) => Number.isFinite(value));
        const desired = parentXs.length
          ? parentXs.reduce((sum, value) => sum + value, 0) / parentXs.length
          : index * minCenterGap;
        desiredById.set(nodeId, desired);
      });

      const packed = packLayer(layerIds, desiredById);
      packed.forEach((x, nodeId) => computedX.set(nodeId, x));
    });

  for (let pass = 0; pass < 2; pass += 1) {
    layerDepths
      .slice()
      .reverse()
      .forEach((layerDepth) => {
        const layerIds = layers.get(layerDepth) || [];
        const desiredById = new Map();
        layerIds.forEach((nodeId) => {
          const childXs = (childrenMap.get(nodeId) || [])
            .map((childId) => computedX.get(childId))
            .filter((value) => Number.isFinite(value));
          const current = computedX.get(nodeId) ?? 0;
          desiredById.set(
            nodeId,
            childXs.length
              ? ((current * 0.45) + (childXs.reduce((sum, value) => sum + value, 0) / childXs.length) * 0.55)
              : current
          );
        });
        const packed = packLayer(layerIds, desiredById);
        packed.forEach((x, nodeId) => computedX.set(nodeId, x));
      });

    layerDepths.forEach((layerDepth) => {
      const layerIds = layers.get(layerDepth) || [];
      const desiredById = new Map();
      layerIds.forEach((nodeId) => {
        const parentXs = (parentsMap.get(nodeId) || [])
          .map((parentId) => computedX.get(parentId))
          .filter((value) => Number.isFinite(value));
        const current = computedX.get(nodeId) ?? 0;
        desiredById.set(
          nodeId,
          parentXs.length
            ? ((current * 0.35) + (parentXs.reduce((sum, value) => sum + value, 0) / parentXs.length) * 0.65)
            : current
        );
      });
      const packed = packLayer(layerIds, desiredById);
      packed.forEach((x, nodeId) => computedX.set(nodeId, x));
    });
  }

  const rawXs = Array.from(computedX.values());
  const minX = Math.min(...rawXs);
  const maxX = Math.max(...rawXs);
  const shiftX = sidePadding + cardWidth / 2 - minX;
  const positions = new Map();
  let graphMaxX = sidePadding;
  let graphMaxY = topY;

  layerDepths.forEach((layerDepth) => {
    const layerIds = layers.get(layerDepth) || [];
    layerIds.forEach((nodeId) => {
      const autoX = (computedX.get(nodeId) ?? 0) + shiftX;
      const autoY = topY + layerDepth * rowGap;
      const stored = pane.nodePositions[nodeId];
      const x = stored?.x ?? autoX;
      const y = stored?.y ?? autoY;
      positions.set(nodeId, { x, y });
      pane.nodePositions[nodeId] = { x, y };
      graphMaxX = Math.max(graphMaxX, x);
      graphMaxY = Math.max(graphMaxY, y);
    });
  });

  return {
    positions,
    width: Math.max(1180, Math.max(maxX + shiftX, graphMaxX) + cardWidth / 2 + sidePadding),
    height: Math.max(840, graphMaxY + cardHeight + 180)
  };
}

function bindViewportPan(paneId) {
  const viewport = document.getElementById(`compare-${paneId}-viewport`);
  if (!viewport || viewport.dataset.panBound === "true") return;

  viewport.dataset.panBound = "true";
  let panState = null;

  const finishPan = (event) => {
    if (!panState || (event && panState.pointerId !== event.pointerId)) return;
    viewport.classList.remove("is-panning");
    try {
      viewport.releasePointerCapture(panState.pointerId);
    } catch (error) {
      // ignore
    }
    panState = null;
  };

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".dynamic-card") || event.target.closest(".canvas-actions") || event.target.closest("button")) return;

    panState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: viewport.scrollLeft,
      startScrollTop: viewport.scrollTop
    };
    viewport.classList.add("is-panning");
    viewport.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!panState || panState.pointerId !== event.pointerId) return;
    const dx = event.clientX - panState.startClientX;
    const dy = event.clientY - panState.startClientY;
    viewport.scrollLeft = panState.startScrollLeft - dx;
    viewport.scrollTop = panState.startScrollTop - dy;
  });

  viewport.addEventListener("pointerup", finishPan);
  viewport.addEventListener("pointercancel", finishPan);
}

function bindViewportWheelZoom(paneId) {
  const viewport = document.getElementById(`compare-${paneId}-viewport`);
  if (!viewport || viewport.dataset.wheelZoomBound === "true") return;

  viewport.dataset.wheelZoomBound = "true";
  viewport.addEventListener("wheel", (event) => {
    if (event.target.closest(".dynamic-toggle")) return;
    event.preventDefault();

    const direction = event.deltaY < 0 ? 1 : -1;
    const step = Math.min(0.18, 0.06 + Math.abs(event.deltaY) / 1200);
    const pane = getPaneState(paneId);
    zoomPaneAtPoint(paneId, pane.zoom + direction * step, event.clientX, event.clientY);
  }, { passive: false });
}

function parseTargetIds(value) {
  return ensureArray(value)
    .flatMap((item) => String(item ?? "").split(/[,\n\r，]+/))
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeJump(rawJump, index) {
  const targetValue = rawJump?.target || rawJump?.["目标节点"] || rawJump?.["连接到"] || "";
  const targets = parseTargetIds(targetValue);
  return {
    id: rawJump?.id || rawJump?.["出口编号"] || `J${index + 1}`,
    condition: rawJump?.condition || rawJump?.["条件"] || rawJump?.["条件表达式"] || rawJump?.["条件摘要"] || "默认推进",
    target: targets.join(", "),
    targets
  };
}

function normalizeNode(rawNode, index) {
  const summary = rawNode?.summary || rawNode?.["事件摘要"] || rawNode?.["事件简介"] || rawNode?.["生成方向"] || "";
  const goal = rawNode?.goal || rawNode?.["节点目标"] || rawNode?.["事件目标"] || "";
  const decisions = ensureArray(rawNode?.decisions || rawNode?.["决策点列表"])
    .map((decision, decisionIndex) => normalizeDecision(decision, decisionIndex));
  const jumps = ensureArray(rawNode?.jumps || rawNode?.["跳转规则"])
    .map((jump, jumpIndex) => normalizeJump(jump, jumpIndex))
    .filter((jump) => jump.targets?.length);
  const directTargets = parseTargetIds(
    rawNode?.target ||
    rawNode?.["目标节点"] ||
    rawNode?.["结构出口"] ||
    rawNode?.["连接到"]
  );
  const settlementStateWrites = ensureArray(
    rawNode?.stateWrites || rawNode?.["状态写入"] || rawNode?.["节点结算"]?.["状态写入"]
  );
  const normalizedJumps = jumps.length
    ? jumps
    : directTargets.map((target, jumpIndex) => ({
        id: `J${jumpIndex + 1}`,
        condition: "默认推进",
        target,
        targets: [target]
      }));

  return {
    id: rawNode?.id || rawNode?.["节点编号"] || rawNode?.nodeId || `E${index + 1}`,
    title: rawNode?.title || rawNode?.["节点标题"] || formatNodeTitle({ summary, goal, id: rawNode?.id || rawNode?.["节点编号"] }),
    summary,
    goal,
    chapter: rawNode?.chapter || rawNode?.["所属章节"] || rawNode?.chapterName || "",
    act: rawNode?.act || rawNode?.["章内幕次"] || rawNode?.["所属幕内幕次"] || "",
    nodeType: rawNode?.nodeType || rawNode?.["节点类型"] || rawNode?.type || "普通节点",
    endingLine: rawNode?.endingLine || rawNode?.["所属终局线"] || null,
    decisions,
    jumps: normalizedJumps,
    settlement: rawNode?.settlement || rawNode?.["节点结算"]?.["摘要"] || rawNode?.["结算描述"] || "",
    stateWrites: settlementStateWrites.map((item) => makeEffectString(item)).filter(Boolean)
  };
}

function getPaneEdges(paneId, nodes = getPaneNodes(paneId)) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgeKeys = new Set();

  return nodes.flatMap((node) =>
    (node.jumps || [])
      .flatMap((jump) =>
        (jump.targets?.length ? jump.targets : parseTargetIds(jump.target))
          .filter((target) => nodeIds.has(target))
          .map((target) => ({
            id: jump.id,
            condition: jump.condition || "",
            target
          }))
      )
      .map((jump) => {
        const key = `${node.id}->${jump.target}`;
        if (edgeKeys.has(key)) return null;
        edgeKeys.add(key);
        return {
          fromId: node.id,
          toId: jump.target,
          type: "default",
          condition: jump.condition || ""
        };
      })
      .filter(Boolean)
  );
}

leftInput.accept = ".json,.xlsx,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
rightInput.accept = ".json,.xlsx,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

renderScoreFormFields();
populateScoreSelects();
updateUploadState();
bindEvents();
syncScorePanelState();
applyCompareWorkspaceLayout();
