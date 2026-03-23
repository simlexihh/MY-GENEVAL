const appShell = document.getElementById("app-shell");
const navList = document.getElementById("nav-list");
const apiStatus = document.getElementById("api-status");
const loadingOverlay = document.getElementById("loading-overlay");
const startScreen = document.getElementById("start-screen");
const intentScreen = document.getElementById("intent-screen");
const structureScreen = document.getElementById("structure-screen");
const dynamicScreen = document.getElementById("dynamic-screen");
const playtestScreen = document.getElementById("playtest-screen");

injectStructureScreenFixed();
injectDynamicScreenFixed();

const screens = {
  start: startScreen,
  intent: intentScreen,
  structure: structureScreen,
  dynamic: dynamicScreen,
  playtest: playtestScreen
};

const detailTabs = Array.from(document.querySelectorAll(".detail-tab"));
const actLegendItems = ["ACT1", "ACT2", "ACT3"];
const chapterPaletteOrder = ["pink", "blue", "pale", "cream", "gray", "mint", "gold"];
const endingLinePaletteOrder = ["gray", "mint", "gold", "pink"];
const actBorderClassMap = {
  ACT1: "act1",
  ACT2: "act2",
  ACT3: "act3"
};

const sidebarLayouts = {
  start: [],
  intent: [
    { screen: "intent", label: "意图层" }
  ],
  structure: [
    { screen: "intent", label: "意图层" },
    { screen: "structure", label: "结构层" }
  ],
  dynamic: [
    { screen: "intent", label: "意图层" },
    { screen: "structure", label: "结构层" },
    { screen: "dynamic", label: "动力层" },
    { screen: "playtest", label: "试玩", cta: true }
  ],
  playtest: [
    { screen: "intent", label: "意图层" },
    { screen: "structure", label: "结构层" },
    { screen: "dynamic", label: "动力层" },
    { screen: "playtest", label: "试玩", cta: true }
  ]
};

const fullSidebarLayout = [
  { screen: "intent", label: "意图层" },
  { screen: "structure", label: "结构层" },
  { screen: "dynamic", label: "动力层" },
  { screen: "playtest", label: "试玩", cta: true }
];

const defaultState = {
  studio: null,
  selectedNodeId: null,
  playtestSession: null,
  playtestSideTab: "status",
  expandedDynamicIds: [],
  structureNodePositions: {},
  dynamicNodePositions: {},
  structureZoom: 1,
  dynamicZoom: 1,
  structureCanvasMetrics: {
    width: 1000,
    height: 760
  },
  dynamicCanvasMetrics: {
    width: 960,
    height: 760
  },
  allLayersGenerated: false,
  activeScreen: "start",
  activeDetailTab: "event",
  intentEditing: {
    theme: false,
    conflicts: false,
    stateMatrix: false
  }
};

const emotionCurveOptions = [
  "持续上升",
  "持续下降",
  "先升后降",
  "先降后升",
  "升-降-升",
  "降-升-降"
];

const interactionTypeOptions = [
  "\u63a8\u7406\u5224\u65ad\u578b",
  "\u63a2\u7d22\u53d9\u4e8b\u578b",
  "\u8d44\u6e90\u7ba1\u7406\u578b",
  "\u9ad8\u538b\u8d23\u4efb\u578b",
  "\u9636\u6bb5\u88c1\u51b3\u578b",
  "\u5173\u7cfb\u6743\u8861\u578b"
];

let state = { ...defaultState };

function ensureExpandedDynamicIds() {
  if (!Array.isArray(state.expandedDynamicIds)) {
    state.expandedDynamicIds = [];
  }
}

function ensureDynamicNodePositions() {
  if (!state.dynamicNodePositions || typeof state.dynamicNodePositions !== "object") {
    state.dynamicNodePositions = {};
  }
}

function ensureStructureNodePositions() {
  if (!state.structureNodePositions || typeof state.structureNodePositions !== "object") {
    state.structureNodePositions = {};
  }
}

function clampCanvasZoom(value) {
  return Math.min(1.8, Math.max(0.6, Number(value) || 1));
}

function applyCanvasZoom(layer, metrics) {
  const scene = document.getElementById(`${layer}-scene`);
  const base = document.getElementById(`${layer}-base`);
  const label = document.getElementById(`${layer}-zoom-label`);
  if (!scene || !base) return;

  const zoomKey = `${layer}Zoom`;
  const zoom = clampCanvasZoom(state[zoomKey]);
  const width = Math.max(1, metrics?.width || 0);
  const height = Math.max(1, metrics?.height || 0);

  state[zoomKey] = zoom;
  base.style.width = `${width}px`;
  base.style.height = `${height}px`;
  base.style.transform = `scale(${zoom})`;
  scene.style.width = `${width * zoom}px`;
  scene.style.height = `${height * zoom}px`;

  if (label) {
    label.textContent = `${Math.round(zoom * 100)}%`;
  }
}

function changeCanvasZoom(layer, delta) {
  const zoomKey = `${layer}Zoom`;
  const metricsKey = `${layer}CanvasMetrics`;
  state[zoomKey] = clampCanvasZoom((state[zoomKey] || 1) + delta);
  applyCanvasZoom(layer, state[metricsKey]);
}

function resetCanvasZoom(layer) {
  const metricsKey = `${layer}CanvasMetrics`;
  state[`${layer}Zoom`] = 1;
  applyCanvasZoom(layer, state[metricsKey]);
}

function isDynamicExpanded(nodeId) {
  ensureExpandedDynamicIds();
  return state.expandedDynamicIds.includes(nodeId);
}

function toggleDynamicExpanded(nodeId) {
  ensureExpandedDynamicIds();
  if (state.expandedDynamicIds.includes(nodeId)) {
    state.expandedDynamicIds = state.expandedDynamicIds.filter((id) => id !== nodeId);
  } else {
    state.expandedDynamicIds = [...state.expandedDynamicIds, nodeId];
  }
}

function injectStructureScreen() {
  structureScreen.innerHTML = `
    <div class="structure-page">
      <div class="structure-flow">
        <div id="chapter-tabs" class="chapter-tabs chapter-tabs-rich"></div>
        <div class="structure-graph-shell">
          <div class="structure-watermark"></div>
          <div id="structure-canvas" class="structure-canvas structure-canvas-graph"></div>
        </div>
        <div class="structure-actions">
          <button id="reset-structure" class="warm-btn" type="button">重新生成</button>
          <button id="add-node" class="gold-btn" type="button">添加节点</button>
          <button id="goto-dynamic" class="mint-btn" type="button">生成动力层</button>
        </div>
      </div>
      <aside class="property-panel structure-property-panel">
        <div class="structure-property-header">属性面板</div>
        <div class="structure-property-body">
          <label>
            <span>节点名</span>
            <input id="node-name" />
          </label>
          <label>
            <span>所属章节</span>
            <select id="node-chapter-select"></select>
          </label>
          <label>
            <span>章内三幕</span>
            <select id="node-act-select"></select>
          </label>
          <div class="structure-toggle-group">
            <div class="toggle-group-title">关键节点设置</div>
            <label class="structure-toggle"><input id="node-empty" type="checkbox" /> 空白节点</label>
            <label class="structure-toggle"><input id="node-key" type="checkbox" /> 终局入口节点</label>
          </div>
          <button id="save-node" class="primary-btn structure-save" type="button">保存节点</button>
        </div>
      </aside>
    </div>
  `;
}

function persistState() {
  return;
}

function injectStructureScreenFixed() {
  structureScreen.innerHTML = `
    <div class="structure-page">
      <div class="structure-flow">
        <div id="chapter-tabs" class="chapter-tabs chapter-tabs-rich"></div>
        <div class="structure-graph-shell">
          <div id="structure-viewport" class="canvas-viewport structure-viewport">
            <div id="structure-scene" class="canvas-scene structure-scene">
              <div id="structure-base" class="canvas-base structure-base">
                <div class="structure-watermark"></div>
                <div id="structure-canvas" class="structure-canvas structure-canvas-graph"></div>
              </div>
            </div>
          </div>
          <div class="canvas-actions structure-actions">
          <button id="reset-structure" class="warm-btn" type="button">\u91cd\u65b0\u751f\u6210</button>
          <button id="add-node" class="gold-btn" type="button">\u6dfb\u52a0\u8282\u70b9</button>
          <button id="goto-dynamic" class="mint-btn" type="button">\u751f\u6210\u52a8\u529b\u5c42</button>
          <div class="canvas-zoom">
            <button id="structure-zoom-out" class="ghost-btn canvas-zoom-btn" type="button">-</button>
            <button id="structure-zoom-reset" class="ghost-btn canvas-zoom-btn canvas-zoom-label" type="button"><span id="structure-zoom-label">100%</span></button>
            <button id="structure-zoom-in" class="ghost-btn canvas-zoom-btn" type="button">+</button>
          </div>
        </div>
        </div>
      </div>
      <aside class="property-panel structure-property-panel">
        <div class="structure-property-header">\u5c5e\u6027\u9762\u677f</div>
        <div class="structure-property-body">
          <label>
            <span>\u8282\u70b9\u540d</span>
            <input id="node-name" />
          </label>
          <label>
            <span>\u6240\u5c5e\u7ae0\u8282</span>
            <select id="node-chapter-select"></select>
          </label>
          <label>
            <span>\u7ae0\u5185\u5e55\u6b21</span>
            <select id="node-act-select"></select>
          </label>
            <div class="structure-toggle-group">
              <div class="toggle-group-title">\u5173\u952e\u8282\u70b9\u8bbe\u7f6e</div>
              <label class="structure-toggle">
                <input id="node-empty" type="checkbox" />
                <span
                class="structure-tooltip-trigger"
                tabindex="0"
                data-tooltip="\u7a7a\u767d\u8282\u70b9\uff1a\u8fd9\u7c7b\u8282\u70b9\u4e0d\u9884\u5148\u5199\u6b7b\u5b8c\u6574\u60c5\u8282\uff0c\u800c\u662f\u5728\u8fd0\u884c\u65f6\u6839\u636e\u72b6\u6001\u53d8\u91cf\u4e0e\u4e0a\u4e0b\u6587\u52a8\u6001\u751f\u6210\u8fc7\u6e21\u6216\u7ec8\u5c40\u5185\u5bb9\u3002"
              >\u7a7a\u767d\u8282\u70b9</span>
            </label>
            <label class="structure-toggle">
              <input id="node-key" type="checkbox" />
              <span
                class="structure-tooltip-trigger"
                tabindex="0"
                data-tooltip="\u7ec8\u5c40\u5165\u53e3\u8282\u70b9\uff1a\u8fd9\u7c7b\u8282\u70b9\u7528\u6765\u6c47\u603b\u524d\u9762\u7684\u5173\u952e\u9009\u62e9\u4e0e\u72b6\u6001\uff0c\u5e76\u636e\u6b64\u5206\u6d41\u5230\u4e0d\u540c\u7684\u7ec8\u5c40\u7ebf\u3002"
                >\u7ec8\u5c40\u5165\u53e3\u8282\u70b9</span>
              </label>
            </div>
            <div class="structure-connection-group">
              <div class="toggle-group-title">\u8fde\u63a5\u5230\u8282\u70b9</div>
              <div class="structure-connection-adder">
                <select id="structure-connection-target"></select>
                <button id="add-structure-connection" class="structure-link-btn" type="button">\u6dfb\u52a0</button>
              </div>
              <div id="structure-connection-list" class="structure-connection-list"></div>
            </div>
            <button id="save-node" class="primary-btn structure-save" type="button">\u4fdd\u5b58\u8282\u70b9</button>
          </div>
        </aside>
      </div>
    `;
}

function injectDynamicScreenFixed() {
  dynamicScreen.innerHTML = `
    <div class="dynamic-page">
      <div class="dynamic-layout">
        <div class="dynamic-flow">
          <header class="screen-header dynamic-page-header">
            <div>
              <h2>\u52a8\u529b\u5c42</h2>
              <p>\u4e8b\u4ef6\u3001\u51b3\u7b56\u4e0e\u8df3\u8f6c\u8054\u52a8\u7f16\u8f91\u3002</p>
            </div>
          </header>
          <div class="dynamic-canvas-shell">
            <div id="dynamic-viewport" class="canvas-viewport dynamic-viewport">
              <div id="dynamic-scene" class="canvas-scene dynamic-scene">
                <div id="dynamic-base" class="canvas-base dynamic-base">
                  <div id="dynamic-timeline" class="timeline dynamic-canvas"></div>
                </div>
              </div>
            </div>
              <div class="canvas-actions dynamic-actions">
                <button id="regenerate-dynamic" class="warm-btn" type="button">\u91cd\u65b0\u751f\u6210</button>
                <button id="goto-playtest" class="mint-btn" type="button">\u9884\u8bd5\u73a9</button>
                <div class="canvas-zoom">
                  <button id="dynamic-zoom-out" class="ghost-btn canvas-zoom-btn" type="button">-</button>
                  <button id="dynamic-zoom-reset" class="ghost-btn canvas-zoom-btn canvas-zoom-label" type="button"><span id="dynamic-zoom-label">100%</span></button>
                  <button id="dynamic-zoom-in" class="ghost-btn canvas-zoom-btn" type="button">+</button>
              </div>
            </div>
          </div>
        </div>
        <aside class="detail-panel dynamic-detail-panel">
          <div class="tab-row">
            <button class="detail-tab active" data-detail-tab="event">\u4e8b\u4ef6</button>
            <button class="detail-tab" data-detail-tab="decision">\u51b3\u7b56</button>
            <button class="detail-tab" data-detail-tab="jump">\u8df3\u8f6c</button>
          </div>
          <div id="detail-content" class="detail-content"></div>
        </aside>
      </div>
    </div>
  `;
}

function showScreen(name) {
  state.activeScreen = name;
  Object.entries(screens).forEach(([key, element]) => {
    element.classList.toggle("hidden", key !== name);
  });
  renderSidebar(name);
  persistState();
}

function renderSidebar(activeScreen) {
  const currentScreen = activeScreen || state.activeScreen;
  const layout = state.allLayersGenerated && currentScreen !== "start"
    ? fullSidebarLayout
    : (sidebarLayouts[currentScreen] || []);
  appShell.classList.toggle("start-mode", currentScreen === "start");
  navList.innerHTML = "";

  layout.forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = "nav-item-wrap";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `nav-item${item.cta ? " nav-item-cta" : ""}`;
      button.textContent = item.label;
      if (item.screen === currentScreen) {
        button.classList.add("active");
      }
      button.addEventListener("click", async () => {
        if (!state.studio) return;
        if (item.screen === "playtest") {
          await resumeOrStartPlaytest();
          return;
        }
        showScreen(item.screen);
      });

    wrapper.appendChild(button);
    navList.appendChild(wrapper);
  });
}

function getAllNodes() {
  if (!state.studio?.structure?.chapters) return [];
  return state.studio.structure.chapters.flatMap((chapter) =>
    chapter.acts.flatMap((act) => act.nodes)
  );
}

function getSelectedNode() {
  const nodes = getAllNodes();
  return nodes.find((node) => node.id === state.selectedNodeId) || nodes[0] || null;
}

function compareStructureNodeIds(leftId, rightId) {
  const leftMatch = String(leftId).match(/^([A-Za-z]+)(\d+)$/);
  const rightMatch = String(rightId).match(/^([A-Za-z]+)(\d+)$/);
  if (leftMatch && rightMatch && leftMatch[1] === rightMatch[1]) {
    return Number(leftMatch[2]) - Number(rightMatch[2]);
  }
  return String(leftId).localeCompare(String(rightId), "zh-Hans-CN");
}

function getConnectableStructureNodes(sourceNodeId) {
  return getAllNodes()
    .filter((item) => item.id !== sourceNodeId)
    .sort((left, right) => compareStructureNodeIds(left.id, right.id));
}

function normalizeStructureTargetIds(targetIds, sourceNodeId) {
  const nodeIds = new Set(getAllNodes().map((node) => node.id));
  const seen = new Set();
  return (targetIds || []).filter((targetId) => {
    if (!targetId || targetId === sourceNodeId || !nodeIds.has(targetId) || seen.has(targetId)) {
      return false;
    }
    seen.add(targetId);
    return true;
  });
}

function inferStructureEdgeKind(node, targetCount = 1) {
  if (!node) return targetCount > 1 ? "branch" : "main";
  const typeLabel = node.nodeType || "";
  if (node.keyNode || targetCount > 1 || /分支|终局入口/.test(typeLabel)) {
    return "branch";
  }
  return "main";
}

function ensureExplicitStructureEdges(nodes = getAllNodes()) {
  if (!state.studio?.structure) return [];

  const nodeIds = new Set(nodes.map((node) => node.id));
  const explicitEdges = Array.isArray(state.studio.structure.edges)
    ? state.studio.structure.edges
        .filter((edge) => edge?.from && edge?.to && edge.from !== edge.to && nodeIds.has(edge.from) && nodeIds.has(edge.to))
        .map((edge) => ({ from: edge.from, to: edge.to, kind: edge.kind || "main" }))
    : [];

  if (explicitEdges.length) {
    state.studio.structure.edges = explicitEdges;
    return explicitEdges;
  }

  const derivedEdges = nodes
    .flatMap((node, index) => {
      const jumpTargets = Array.isArray(node.jumps)
        ? node.jumps
            .map((jump) => jump?.target)
            .filter((targetId) => targetId && targetId !== node.id && nodeIds.has(targetId))
        : [];
      if (jumpTargets.length) {
        const kind = inferStructureEdgeKind(node, jumpTargets.length);
        return normalizeStructureTargetIds(jumpTargets, node.id).map((targetId) => ({
          from: node.id,
          to: targetId,
          kind
        }));
      }

      const nextNode = nodes[index + 1];
      if (!nextNode) return [];
      return [{
        from: node.id,
        to: nextNode.id,
        kind: "main"
      }];
    })
    .filter(Boolean);

  state.studio.structure.edges = derivedEdges;
  return derivedEdges;
}

function getStructureOutgoingTargetIds(nodeId) {
  return getStructureEdges()
    .filter((edge) => edge.fromId === nodeId)
    .map((edge) => edge.toId);
}

function syncNodeJumpsWithStructureTargets(node, targetIds) {
  if (!node) return;

  const safeTargets = normalizeStructureTargetIds(targetIds, node.id);
  const currentJumps = Array.isArray(node.jumps) ? node.jumps : [];
  node.jumps = safeTargets.map((targetId, index) => {
    const byTarget = currentJumps.find((jump) => jump?.target === targetId);
    const byIndex = currentJumps[index];
    const source = byTarget || byIndex || {};
    return {
      ...source,
      id: source.id || `J${index + 1}`,
      target: targetId,
      condition: source.condition || "\u9ed8\u8ba4\u63a8\u8fdb"
    };
  });
}

function setStructureNodeTargets(nodeId, targetIds) {
  if (!state.studio?.structure) return;

  const node = getAllNodes().find((item) => item.id === nodeId);
  if (!node) return;

  const normalizedTargets = normalizeStructureTargetIds(targetIds, nodeId);
  const explicitEdges = ensureExplicitStructureEdges();
  const remainingEdges = explicitEdges.filter((edge) => edge.from !== nodeId);
  const edgeKind = inferStructureEdgeKind(node, normalizedTargets.length);

  state.studio.structure.edges = [
    ...remainingEdges,
    ...normalizedTargets.map((targetId) => ({
      from: nodeId,
      to: targetId,
      kind: edgeKind
    }))
  ];

  syncNodeJumpsWithStructureTargets(node, normalizedTargets);
}

function renameNodeReferences(previousId, nextId) {
  if (!previousId || !nextId || previousId === nextId) return;

  const nodes = getAllNodes();
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgeKeys = new Set();

  state.studio.structure.edges = ensureExplicitStructureEdges(nodes)
    .map((edge) => ({
      ...edge,
      from: edge.from === previousId ? nextId : edge.from,
      to: edge.to === previousId ? nextId : edge.to
    }))
    .filter((edge) => edge.from && edge.to && edge.from !== edge.to && nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .filter((edge) => {
      const key = `${edge.from}->${edge.to}`;
      if (edgeKeys.has(key)) return false;
      edgeKeys.add(key);
      return true;
    });

  getAllNodes().forEach((node) => {
    if (!Array.isArray(node.jumps)) return;
    node.jumps = node.jumps.map((jump) => (
      jump?.target === previousId
        ? { ...jump, target: nextId }
        : jump
    ));
  });

  if (Array.isArray(state.studio?.dynamic?.order)) {
    state.studio.dynamic.order = state.studio.dynamic.order.map((id) => (id === previousId ? nextId : id));
  }

  if (Array.isArray(state.studio?.dynamic?.defaultExpandedNodeIds)) {
    state.studio.dynamic.defaultExpandedNodeIds = state.studio.dynamic.defaultExpandedNodeIds.map((id) => (
      id === previousId ? nextId : id
    ));
  }

  if (state.studio?.playtest?.nodeId === previousId) {
    state.studio.playtest.nodeId = nextId;
  }

  if (state.structureNodePositions?.[previousId]) {
    state.structureNodePositions[nextId] = state.structureNodePositions[previousId];
    delete state.structureNodePositions[previousId];
  }

  if (state.dynamicNodePositions?.[previousId]) {
    state.dynamicNodePositions[nextId] = state.dynamicNodePositions[previousId];
    delete state.dynamicNodePositions[previousId];
  }
}

function resolveStructureNodeType(node) {
  const currentType = node.nodeType || "\u666e\u901a\u8282\u70b9";
  if (node.keyNode) return "\u7ec8\u5c40\u5165\u53e3\u8282\u70b9";
  if (node.emptyNode) return "\u7a7a\u767d\u8282\u70b9";
  return /终局入口|空白/.test(currentType) ? "\u666e\u901a\u8282\u70b9" : currentType;
}

function getStructureEdges(nodes = getAllNodes()) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const explicitEdges = (state.studio?.structure?.edges || [])
    .filter((edge) => edge?.from && edge?.to && nodeMap.has(edge.from) && nodeMap.has(edge.to))
    .map((edge) => ({ fromId: edge.from, toId: edge.to, kind: edge.kind || "main" }));

  if (explicitEdges.length) {
    return explicitEdges;
  }

  return nodes
    .map((node, index) => {
      const nextNode = nodes[index + 1];
      if (!nextNode) return null;
      return { fromId: node.id, toId: nextNode.id, kind: "main" };
    })
    .filter(Boolean);
}

function getDynamicOrderedNodes() {
  const nodes = getAllNodes();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const explicitOrder = state.studio?.dynamic?.order || [];
  const ordered = explicitOrder.map((id) => nodeMap.get(id)).filter(Boolean);
  const used = new Set(ordered.map((node) => node.id));
  const remaining = nodes.filter((node) => !used.has(node.id));
  return [...ordered, ...remaining];
}

function getDefaultExpandedDynamicIds() {
  const orderedNodes = getDynamicOrderedNodes();
  const explicitSource = state.studio?.dynamic?.defaultExpandedNodeIds;
  if (Array.isArray(explicitSource)) {
    return explicitSource.filter((id) => orderedNodes.some((node) => node.id === id));
  }
  return [];
}

function getDynamicEdges(nodes = getDynamicOrderedNodes()) {
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
          condition: jump.condition || "",
          note: jump.note || ""
        };
      })
      .filter(Boolean)
  );
}

function buildDynamicLayout(nodes = getDynamicOrderedNodes()) {
  const orderIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const edges = getDynamicEdges(nodes);
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
    return { positions: new Map(), width: 820, height: 620 };
  }

  if (depth.size === 0) {
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

  const orderScore = new Map();
  layers.forEach((layer, level) => {
    if (level === 0) {
      layer.sort((left, right) => orderIndex.get(left.id) - orderIndex.get(right.id));
      layer.forEach((node, index) => orderScore.set(node.id, index));
      return;
    }

    layer.sort((left, right) => {
      const leftParents = parentsMap.get(left.id) || [];
      const rightParents = parentsMap.get(right.id) || [];
      const leftScore = leftParents.length
        ? leftParents.reduce((sum, parentId) => sum + (orderScore.get(parentId) ?? orderIndex.get(parentId) ?? 0), 0) / leftParents.length
        : orderIndex.get(left.id);
      const rightScore = rightParents.length
        ? rightParents.reduce((sum, parentId) => sum + (orderScore.get(parentId) ?? orderIndex.get(parentId) ?? 0), 0) / rightParents.length
        : orderIndex.get(right.id);
      return leftScore - rightScore || orderIndex.get(left.id) - orderIndex.get(right.id);
    });

    layer.forEach((node, index) => orderScore.set(node.id, index));
  });

  ensureDynamicNodePositions();

  const positions = new Map();
  const centerX = 540;
  const topY = 40;
  const rowGap = 250;
  const columnGap = 260;
  const cardWidth = 280;
  const cardHeight = 196;

  layers.forEach((layer, level) => {
    const count = layer.length;
    const spread = Math.max(0, (count - 1) * columnGap);
    const startX = centerX - spread / 2;
    layer.forEach((node, index) => {
      const stored = state.dynamicNodePositions[node.id];
      const x = stored?.x ?? (count === 1 ? centerX : startX + columnGap * index);
      const y = stored?.y ?? (topY + level * rowGap);
      positions.set(node.id, { x, y });
      state.dynamicNodePositions[node.id] = { x, y };
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

function syncDynamicCanvasBounds(timeline, fallback = {}) {
  const entries = Array.from(timeline.querySelectorAll(".dynamic-card-entry"));
  const baseWidth = Math.max(
    fallback.width || 0,
    timeline.parentElement?.clientWidth || 0,
    timeline.clientWidth || 0,
    960
  );
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

  return { width: maxWidth, height: maxHeight };
}

function syncStructureCanvasBounds(canvas, fallback = {}) {
  const nodes = Array.from(canvas.querySelectorAll(".graph-node"));
  let maxWidth = Math.max(fallback.width || 0, 1000);
  let maxHeight = Math.max(fallback.height || 0, 760);

  nodes.forEach((node) => {
    const x = parseFloat(node.style.left) || 0;
    const y = parseFloat(node.style.top) || 0;
    const width = node.offsetWidth || 0;
    const height = node.offsetHeight || 0;
    maxWidth = Math.max(maxWidth, x + width / 2 + 80);
    maxHeight = Math.max(maxHeight, y + height + 80);
  });

  canvas.style.width = `${maxWidth}px`;
  canvas.style.minWidth = `${maxWidth}px`;
  canvas.style.height = `${maxHeight}px`;
  canvas.style.minHeight = `${maxHeight}px`;

  return { width: maxWidth, height: maxHeight };
}

function getChapterPalette(node) {
  if (node?.endingLine) {
    const endingLines = [...new Set(getAllNodes().map((item) => item.endingLine).filter(Boolean))];
    const endingIndex = Math.max(endingLines.indexOf(node.endingLine), 0);
    return endingLinePaletteOrder[endingIndex % endingLinePaletteOrder.length];
  }

  const chapters = [...new Set(getAllNodes().map((item) => item.chapter).filter(Boolean))];
  const chapterIndex = Math.max(chapters.indexOf(node.chapter), 0);
  return chapterPaletteOrder[chapterIndex % chapterPaletteOrder.length];
}

function getStructureLegendItems() {
  const chapterItems = (state.studio?.structure?.chapters || []).map((chapter, index) => ({
    label: chapter.name,
    palette: chapterPaletteOrder[index % chapterPaletteOrder.length]
  }));

  const endingItems = [...new Set(getAllNodes().map((item) => item.endingLine).filter(Boolean))]
    .map((line, index) => ({
      label: line,
      palette: endingLinePaletteOrder[index % endingLinePaletteOrder.length]
    }));

  return [
    ...chapterItems,
    ...endingItems,
    { label: "\u7a7a\u767d\u8282\u70b9", palette: "blank", shape: "square" }
  ];
}

function getActBorderClass(node) {
  return actBorderClassMap[node.act] || "act2";
}

function getStructureNodeVisualSize(node) {
  return node?.emptyNode ? 28 : 34;
}

function buildStructureEdgePathRecord(fromNode, toNode, fromPosition, toPosition) {
  if (!fromNode || !toNode || !fromPosition || !toPosition) return null;
  const fromSize = getStructureNodeVisualSize(fromNode);
  const toSize = getStructureNodeVisualSize(toNode);
  const startY = fromPosition.y + fromSize;
  const endY = toPosition.y;
  const middleY = startY + (endY - startY) / 2;
  return {
    fromId: fromNode.id,
    toId: toNode.id,
    path: `M${fromPosition.x} ${startY} V${middleY} H${toPosition.x} V${endY}`
  };
}

function buildStructureGraphData() {
  const nodes = getAllNodes();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const orderIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const childrenMap = new Map(nodes.map((node) => [node.id, []]));
  const parentsMap = new Map(nodes.map((node) => [node.id, []]));
  const edgeSet = new Set();

  function addEdge(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const key = `${fromId}->${toId}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    childrenMap.get(fromId)?.push(toId);
    parentsMap.get(toId)?.push(fromId);
  }

  getStructureEdges(nodes).forEach((edge) => addEdge(edge.fromId, edge.toId));

  const depth = new Map();
  nodes.forEach((node) => {
    if (!parentsMap.get(node.id)?.length) {
      depth.set(node.id, 0);
    }
  });
  if (!nodes.length) {
    return { layoutNodes: [], layoutEdges: [], height: 640 };
  }
  if (depth.size === 0) {
    depth.set(nodes[0].id, 0);
  }

  nodes.forEach((node) => {
    const baseDepth = depth.get(node.id) ?? 0;
    (childrenMap.get(node.id) || []).forEach((childId) => {
      const nextDepth = baseDepth + 1;
      depth.set(childId, Math.max(depth.get(childId) ?? 0, nextDepth));
    });
  });

  const maxDepth = Math.max(...Array.from(depth.values()));
  const layers = Array.from({ length: maxDepth + 1 }, () => []);
  nodes.forEach((node) => {
    const level = depth.get(node.id) ?? 0;
    layers[level].push(node);
  });

  const orderScore = new Map();
  layers.forEach((layer, level) => {
    if (level === 0) {
      layer.sort((left, right) => orderIndex.get(left.id) - orderIndex.get(right.id));
      layer.forEach((node, index) => orderScore.set(node.id, index));
      return;
    }

    layer.sort((left, right) => {
      const leftParents = parentsMap.get(left.id) || [];
      const rightParents = parentsMap.get(right.id) || [];
      const leftScore = leftParents.length
        ? leftParents.reduce((sum, parentId) => sum + (orderScore.get(parentId) ?? orderIndex.get(parentId) ?? 0), 0) / leftParents.length
        : orderIndex.get(left.id);
      const rightScore = rightParents.length
        ? rightParents.reduce((sum, parentId) => sum + (orderScore.get(parentId) ?? orderIndex.get(parentId) ?? 0), 0) / rightParents.length
        : orderIndex.get(right.id);
      return leftScore - rightScore || orderIndex.get(left.id) - orderIndex.get(right.id);
    });

    layer.forEach((node, index) => orderScore.set(node.id, index));
  });

  const positions = new Map();
  const centerX = 500;
  const topY = 92;
  const layerGap = 96;

  ensureStructureNodePositions();

  layers.forEach((layer, level) => {
    const count = layer.length;
    const spread = Math.min(560, Math.max(0, (count - 1) * 140));
    const startX = centerX - spread / 2;
    layer.forEach((node, index) => {
      const stored = state.structureNodePositions[node.id];
      const x = stored?.x ?? (count === 1 ? centerX : startX + (spread / Math.max(count - 1, 1)) * index);
      const y = stored?.y ?? (topY + level * layerGap);
      positions.set(node.id, { x, y });
      state.structureNodePositions[node.id] = { x, y };
    });
  });

  const layoutNodes = nodes.map((node) => ({
    node,
    x: positions.get(node.id).x,
    y: positions.get(node.id).y,
    palette: getChapterPalette(node),
    borderClass: getActBorderClass(node)
  }));

  const layoutEdges = Array.from(edgeSet).map((edge) => {
    const [fromId, toId] = edge.split("->");
    const fromNode = nodeMap.get(fromId);
    const toNode = nodeMap.get(toId);
    const from = positions.get(fromId);
    const to = positions.get(toId);
    return buildStructureEdgePathRecord(fromNode, toNode, from, to);
  }).filter(Boolean);

  const maxX = Math.max(...Array.from(positions.values()).map((item) => item.x));
  const maxY = Math.max(...Array.from(positions.values()).map((item) => item.y));
  const graphHeight = Math.max(topY + maxDepth * layerGap + 140, maxY + 180);
  const graphWidth = Math.max(1000, maxX + 80);
  return { layoutNodes, layoutEdges, width: graphWidth, height: Math.max(640, graphHeight) };
}

function normalizeExperienceGoal(goal) {
  const current = goal || {};
  const emotionMap = {
    "渐进攀升": "持续上升",
    "持续压迫": "持续下降",
    "波浪推进": "升-降-升"
  };
  const interactionMap = {
    "\u9ad8\u538b\u6f5c\u5165": "\u9ad8\u538b\u8d23\u4efb\u578b",
    "\u9ad8\u538b\u8d23\u4efb\u4f53\u9a8c": "\u9ad8\u538b\u8d23\u4efb\u578b",
    "\u8c03\u67e5\u63a8\u7406": "\u63a8\u7406\u5224\u65ad\u578b",
    "\u63a8\u7406\u5224\u65ad\u578b": "\u63a8\u7406\u5224\u65ad\u578b",
    "\u63a2\u7d22\u63a8\u8fdb\u4f53\u9a8c": "\u63a2\u7d22\u53d9\u4e8b\u578b",
    "\u63a2\u7d22\u53d9\u4e8b\u578b": "\u63a2\u7d22\u53d9\u4e8b\u578b",
    "\u8d44\u6e90\u535a\u5f08": "\u8d44\u6e90\u7ba1\u7406\u578b",
    "\u8d44\u6e90\u7ba1\u7406\u578b": "\u8d44\u6e90\u7ba1\u7406\u578b",
    "\u591a\u7ebf\u6289\u62e9": "\u9636\u6bb5\u88c1\u51b3\u578b",
    "\u51b3\u65ad\u4f53\u9a8c": "\u9636\u6bb5\u88c1\u51b3\u578b",
    "\u9636\u6bb5\u88c1\u51b3\u578b": "\u9636\u6bb5\u88c1\u51b3\u578b",
    "\u5173\u7cfb\u6743\u8861\u578b": "\u5173\u7cfb\u6743\u8861\u578b"
  };

  const emotionCurve = emotionMap[current.emotionCurve] || current.emotionCurve || emotionCurveOptions[3];
  const interactionType = interactionMap[current.interactionType] || current.interactionType || interactionTypeOptions[0];

  return {
    emotionCurve: emotionCurveOptions.includes(emotionCurve) ? emotionCurve : emotionCurveOptions[3],
    interactionType: interactionTypeOptions.includes(interactionType) ? interactionType : interactionTypeOptions[0]
  };
}

function setIntentEditing(panel, editing) {
  state.intentEditing = state.intentEditing || {};
  state.intentEditing[panel] = editing;
}

function parseStateMatrixInput(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[:：]/);
      const category = (parts.shift() || "").trim();
      const description = parts.join("：").trim();
      return {
        category: category || "未命名",
        description: description || ""
      };
    });
}

function syncSelectOptions(selectId, options) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const currentOptions = Array.from(select.options).map((option) => option.value);
  const needsRefresh = currentOptions.length !== options.length
    || currentOptions.some((value, index) => value !== options[index]);

  if (!needsRefresh) return;

  select.innerHTML = options
    .map((value) => `<option value="${value}">${value}</option>`)
    .join("");
}

function applyIntentEditingState(panel, editing) {
  const viewMap = {
    theme: "theme-view",
    conflicts: "conflict-view",
    stateMatrix: "state-matrix"
  };

  const editorMap = {
    theme: "theme-editor",
    conflicts: "conflict-editor",
    stateMatrix: "state-editor"
  };

  const view = document.getElementById(viewMap[panel]);
  const editor = document.getElementById(editorMap[panel]);
  if (!view || !editor) return;
  view.classList.toggle("hidden", editing);
  editor.classList.toggle("hidden", !editing);
}

function renderIntent() {
  if (!state.studio) return;
  state.studio.experienceGoal = normalizeExperienceGoal(state.studio.experienceGoal);
  syncSelectOptions("emotion-curve", emotionCurveOptions);
  syncSelectOptions("interaction-type", interactionTypeOptions);
  document.getElementById("story-logline").value = state.studio.logline || "";
  document.getElementById("theme-view").textContent = state.studio.theme || "";
  document.getElementById("theme-editor").value = state.studio.theme || "";
  document.getElementById("emotion-curve").value = state.studio.experienceGoal?.emotionCurve || "";
  document.getElementById("interaction-type").value = state.studio.experienceGoal?.interactionType || "";

  const conflictView = document.getElementById("conflict-view");
  conflictView.innerHTML = "";
  (state.studio.conflictSystem || []).forEach((item) => {
    const row = document.createElement("div");
    row.className = "intent-list-row";
    row.textContent = item;
    conflictView.appendChild(row);
  });
  document.getElementById("conflict-editor").value = (state.studio.conflictSystem || []).join("\n");

  const matrix = document.getElementById("state-matrix");
  matrix.innerHTML = "";
  (state.studio.stateMatrix || []).forEach((row) => {
    const wrapper = document.createElement("div");
    wrapper.className = "matrix-row";
    wrapper.innerHTML = `<strong>${row.category}</strong><span>${row.description}</span>`;
    matrix.appendChild(wrapper);
  });
  document.getElementById("state-editor").value = (state.studio.stateMatrix || [])
    .map((row) => `${row.category}：${row.description}`)
    .join("\n");

  applyIntentEditingState("theme", Boolean(state.intentEditing?.theme));
  applyIntentEditingState("conflicts", Boolean(state.intentEditing?.conflicts));
  applyIntentEditingState("stateMatrix", Boolean(state.intentEditing?.stateMatrix));
}

function renderStructure() {
  renderStructureLegend();
  renderStructureGraph();
  renderStructurePanel();
}

function renderStructureLegend() {
  const selectedNode = getSelectedNode();
  const container = document.getElementById("chapter-tabs");
  container.innerHTML = "";

  const legendTrack = document.createElement("div");
  legendTrack.className = "chapter-track";
  getStructureLegendItems().forEach((item) => {
    const element = document.createElement("div");
    element.className = "rail-chip legend-chip";
    element.innerHTML = `<span class="rail-dot rail-dot-${item.palette}${item.shape === "square" ? " rail-dot-square" : ""}"></span><span>${item.label}</span>`;
    legendTrack.appendChild(element);
  });

  const actTrack = document.createElement("div");
  actTrack.className = "act-track";
  actLegendItems.forEach((actName) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `act-chip act-chip-${actBorderClassMap[actName] || "act2"}`;
    if (selectedNode?.act === actName) button.classList.add("active");
    button.textContent = actName;
    button.addEventListener("click", () => {
      const node = getAllNodes().find((item) => item.act === actName);
      if (!node) return;
      state.selectedNodeId = node.id;
      renderAll();
    });
    actTrack.appendChild(button);
  });

  container.appendChild(legendTrack);
  container.appendChild(actTrack);
}

function renderStructureGraph() {
  const graph = buildStructureGraphData();
  const canvas = document.getElementById("structure-canvas");
  canvas.innerHTML = "";
  const bounds = syncStructureCanvasBounds(canvas, graph);
  renderStructureGraphLinks(canvas, graph, bounds);

  graph.layoutNodes.forEach(({ node, x, y, palette, borderClass }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `graph-node graph-node-${palette} graph-border-${borderClass}${node.emptyNode ? " graph-node-square" : ""}${node.id === state.selectedNodeId ? " is-selected" : ""}`;
    button.dataset.nodeId = node.id;
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
      button.title = node.id;
    if (node.keyNode) {
      button.classList.add("is-key-node");
    }
    button.addEventListener("click", () => {
      state.selectedNodeId = node.id;
      renderAll();
    });

    bindStructureDrag(button, node.id, canvas);
    canvas.appendChild(button);
  });

  const finalBounds = syncStructureCanvasBounds(canvas, graph);
  renderStructureGraphLinks(canvas, graph, finalBounds);
  state.structureCanvasMetrics = finalBounds;
  applyCanvasZoom("structure", state.structureCanvasMetrics);
}

function renderStructureGraphLinks(canvas, graph = buildStructureGraphData(), bounds = syncStructureCanvasBounds(canvas, graph)) {
  const existing = canvas.querySelector(".graph-links");
  if (existing) existing.remove();

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "graph-links");
  svg.setAttribute("width", `${bounds.width}`);
  svg.setAttribute("height", `${bounds.height}`);
  svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
  svg.setAttribute("preserveAspectRatio", "none");

  graph.layoutEdges.forEach((edge) => {
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", edge.path);
    svg.appendChild(path);
  });

  canvas.prepend(svg);
}

function bindStructureDrag(button, nodeId, canvas) {
  let dragState = null;

  const finishDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const moved = dragState.moved;
    dragState = null;
    button.classList.remove("is-dragging");
    try {
      button.releasePointerCapture(event.pointerId);
    } catch (error) {
      // ignore pointer capture release failures
    }
    if (!moved) {
      state.selectedNodeId = nodeId;
      renderAll();
    }
  };

  button.addEventListener("pointerdown", (event) => {
    dragState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: parseFloat(button.style.left) || 0,
      originY: parseFloat(button.style.top) || 0,
      moved: false
    };
    button.classList.add("is-dragging");
    button.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  button.addEventListener("pointermove", (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const dx = event.clientX - dragState.startClientX;
    const dy = event.clientY - dragState.startClientY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      dragState.moved = true;
    }

    const x = Math.max(40, dragState.originX + dx);
    const y = Math.max(20, dragState.originY + dy);
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
    ensureStructureNodePositions();
    state.structureNodePositions[nodeId] = { x, y };

    const graph = buildStructureGraphData();
    const bounds = syncStructureCanvasBounds(canvas, graph);
    renderStructureGraphLinks(canvas, graph, bounds);
    state.structureCanvasMetrics = bounds;
    applyCanvasZoom("structure", bounds);
  });

  button.addEventListener("pointerup", finishDrag);
  button.addEventListener("pointercancel", finishDrag);
}

function buildStructureConnectionSelect(nodeId, selectedId = "") {
  const select = document.createElement("select");
  select.className = "structure-connection-select";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "\u9009\u62e9\u76ee\u6807\u8282\u70b9";
  select.appendChild(placeholder);

  getConnectableStructureNodes(nodeId)
    .forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
        option.textContent = item.id;
      select.appendChild(option);
    });

  select.value = selectedId || "";
  return select;
}

function readStructureConnectionTargets(nodeId = getSelectedNode()?.id) {
  if (!nodeId) return [];
  const values = Array.from(document.querySelectorAll(".structure-connection-select"))
    .map((select) => select.value.trim())
    .filter(Boolean);
  return normalizeStructureTargetIds(values, nodeId);
}

function renderStructureConnectionEditor(nodeId, targetIds = getStructureOutgoingTargetIds(nodeId)) {
  const addSelect = document.getElementById("structure-connection-target");
  const addButton = document.getElementById("add-structure-connection");
  const list = document.getElementById("structure-connection-list");
  if (!addSelect || !addButton || !list) return;

  const normalizedTargets = normalizeStructureTargetIds(targetIds, nodeId);
  const availableTargets = getConnectableStructureNodes(nodeId)
    .filter((item) => !normalizedTargets.includes(item.id));

  addSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = availableTargets.length
    ? "\u9009\u62e9\u8981\u8fde\u63a5\u7684\u8282\u70b9"
    : "\u6ca1\u6709\u53ef\u6dfb\u52a0\u7684\u76ee\u6807\u8282\u70b9";
  addSelect.appendChild(placeholder);

  availableTargets.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
      option.textContent = item.id;
    addSelect.appendChild(option);
  });

  addButton.disabled = !availableTargets.length;
  list.innerHTML = "";

  if (!normalizedTargets.length) {
    const empty = document.createElement("div");
    empty.className = "structure-connection-empty";
    empty.textContent = "\u5f53\u524d\u8282\u70b9\u6682\u65e0\u51fa\u8fb9\u8fde\u63a5\u3002";
    list.appendChild(empty);
    return;
  }

  normalizedTargets.forEach((targetId, index) => {
    const row = document.createElement("div");
    row.className = "structure-connection-row";

    const select = buildStructureConnectionSelect(nodeId, targetId);
    select.dataset.connectionIndex = String(index);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "structure-link-btn structure-link-btn-danger";
    removeButton.dataset.removeConnection = String(index);
    removeButton.textContent = "\u5220\u9664";

    row.appendChild(select);
    row.appendChild(removeButton);
    list.appendChild(row);
  });
}

function renderStructurePanel() {
  const node = getSelectedNode();
  if (!node) return;

  document.getElementById("node-name").value = node.id || "";
  document.getElementById("node-empty").checked = Boolean(node.emptyNode);
  document.getElementById("node-key").checked = Boolean(node.keyNode);

  const chapters = [...new Set(getAllNodes().map((item) => item.chapter).filter(Boolean))];
  const acts = [...new Set(getAllNodes().map((item) => item.act).filter(Boolean))];

  const chapterSelect = document.getElementById("node-chapter-select");
  chapterSelect.innerHTML = chapters.map((chapter) => `<option value="${chapter}">${chapter}</option>`).join("");
  chapterSelect.value = node.chapter || chapters[0] || "";

  const actSelect = document.getElementById("node-act-select");
  actSelect.innerHTML = acts.map((act) => `<option value="${act}">${act}</option>`).join("");
  actSelect.value = node.act || acts[0] || "";

  renderStructureConnectionEditor(node.id);
}

function renderDynamic() {
  const timeline = document.getElementById("dynamic-timeline");
  timeline.innerHTML = "";
  const nodes = getDynamicOrderedNodes();

  ensureExpandedDynamicIds();

  nodes.forEach((node, index) => {
    const expanded = isDynamicExpanded(node.id);
    const entry = document.createElement("section");
    entry.className = `timeline-entry${index === nodes.length - 1 ? " is-last" : ""}${node.id === state.selectedNodeId ? " is-active" : ""}`;
    entry.dataset.nodeId = node.id;
    entry.innerHTML = `
      <div class="timeline-entry-branch"></div>
      <article class="timeline-node${expanded ? " expanded" : ""}${node.id === state.selectedNodeId ? " active" : ""}">
        <button class="timeline-node-head timeline-toggle" type="button">
          <span class="timeline-node-title">${node.id} ${node.title}</span>
          <span class="timeline-node-chevron">${expanded ? "-" : "+"}</span>
        </button>
        <div class="timeline-node-summary">${node.summary || ""}</div>
        <div class="timeline-node-body${expanded ? "" : " hidden"}">
          <div><strong>事件目标</strong></div>
          <div>${node.goal || ""}</div>
          <div><strong>决策点</strong></div>
          <div>${(node.decisions || []).map((item) => `${item.id} ${item.title}`).join("<br>") || "无"}</div>
          <div><strong>跳转</strong></div>
          <div>${(node.jumps || []).map((jump) => `${jump.id} → ${jump.target}`).join("<br>") || "无"}</div>
        </div>
      </article>
    `;

    entry.querySelector(".timeline-toggle").addEventListener("click", () => {
      state.selectedNodeId = node.id;
      toggleDynamicExpanded(node.id);
      renderAll();
    });

    timeline.appendChild(entry);
  });

  renderDynamicConnections(timeline, nodes);

  renderDetailPanel();
}

function renderDynamicConnections(timeline, nodes) {
  const edges = getDynamicEdges(nodes);
  if (!edges.length) return;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "dynamic-links");

  const rect = timeline.getBoundingClientRect();
  const width = Math.max(timeline.scrollWidth, rect.width || 0, 520);
  const height = Math.max(timeline.scrollHeight, rect.height || 0, 320);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");

  edges.forEach((edge, edgeIndex) => {
    const fromEntry = timeline.querySelector(`[data-node-id="${edge.fromId}"]`);
    const toEntry = timeline.querySelector(`[data-node-id="${edge.toId}"]`);
    if (!fromEntry || !toEntry) return;

    const fromBranch = fromEntry.querySelector(".timeline-entry-branch");
    const toBranch = toEntry.querySelector(".timeline-entry-branch");
    if (!fromBranch || !toBranch) return;

    const fromY = fromEntry.offsetTop + fromBranch.offsetTop + fromBranch.offsetHeight / 2;
    const toY = toEntry.offsetTop + toBranch.offsetTop + toBranch.offsetHeight / 2;
    const startX = fromBranch.offsetLeft + fromBranch.offsetWidth;
    const endX = toBranch.offsetLeft;
    const laneX = 70 + (edgeIndex % 4) * 18;
    const pathValue = `M${startX} ${fromY} H${laneX} V${toY} H${endX}`;

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", pathValue);
    path.setAttribute("class", `dynamic-edge dynamic-edge-${edge.type || "default"}`);
    svg.appendChild(path);
  });

  timeline.prepend(svg);
}

function renderDynamicCanvas() {
  const timeline = document.getElementById("dynamic-timeline");
  const nodes = getDynamicOrderedNodes();
  const layout = buildDynamicLayout(nodes);

  timeline.className = "timeline dynamic-canvas";
  timeline.innerHTML = "";

  ensureExpandedDynamicIds();

  nodes.forEach((node) => {
    const expanded = isDynamicExpanded(node.id);
    const position = layout.positions.get(node.id) || { x: 220, y: 40 };
    const entry = document.createElement("section");
    entry.className = `timeline-entry dynamic-card-entry${node.id === state.selectedNodeId ? " is-active" : ""}`;
    entry.dataset.nodeId = node.id;
    entry.style.left = `${position.x}px`;
    entry.style.top = `${position.y}px`;

    entry.innerHTML = `
      <article class="timeline-node dynamic-card${expanded ? " expanded" : ""}${node.id === state.selectedNodeId ? " active" : ""}">
        <div class="timeline-node-head dynamic-card-head">
          <div class="dynamic-card-head-main">
            <span class="dynamic-card-grip" aria-hidden="true">::</span>
            <span class="timeline-node-title">${node.id} ${node.title}</span>
          </div>
          <button class="dynamic-toggle" type="button" aria-label="toggle">
            ${expanded ? "-" : "+"}
          </button>
        </div>
        <div class="timeline-node-summary">${node.summary || ""}</div>
        <div class="timeline-node-body${expanded ? "" : " hidden"}">
          <div><strong>事件目标</strong></div>
          <div>${node.goal || ""}</div>
          <div><strong>决策点</strong></div>
          <div>${(node.decisions || []).map((item) => `${item.id} ${item.title}`).join("<br>") || "无"}</div>
          <div><strong>跳转</strong></div>
          <div>${(node.jumps || []).map((jump) => `${jump.id} -> ${jump.target}`).join("<br>") || "无"}</div>
        </div>
      </article>
    `;

    const toggle = entry.querySelector(".dynamic-toggle");
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedNodeId = node.id;
      toggleDynamicExpanded(node.id);
      renderAll();
    });

    const card = entry.querySelector(".dynamic-card");
    card.addEventListener("click", () => {
      state.selectedNodeId = node.id;
      renderAll();
    });

    bindDynamicDrag(entry, node.id, timeline, nodes);
    timeline.appendChild(entry);
  });

  const bounds = syncDynamicCanvasBounds(timeline, layout);
  state.dynamicCanvasMetrics = bounds;
  applyCanvasZoom("dynamic", bounds);
  renderDynamicCanvasConnections(timeline, nodes, bounds);
  renderDetailPanel();
}

function renderDynamicCanvasConnections(timeline, nodes, bounds = syncDynamicCanvasBounds(timeline)) {
  const existing = timeline.querySelector(".dynamic-links");
  if (existing) existing.remove();

  const edges = getDynamicEdges(nodes);
  if (!edges.length) return;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "dynamic-links");

  const width = Math.max(bounds.width || 0, timeline.clientWidth || 0, 960);
  const height = Math.max(bounds.height || 0, timeline.clientHeight || 0, 760);
  svg.setAttribute("width", `${width}`);
  svg.setAttribute("height", `${height}`);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
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
    const middleY = startY + (endY - startY) / 2;

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", `M${startX} ${startY} V${middleY} H${endX} V${endY}`);
    path.setAttribute("class", `dynamic-edge dynamic-edge-${edge.type || "default"}`);
    svg.appendChild(path);
  });

  timeline.prepend(svg);
}

function bindDynamicDrag(entry, nodeId, timeline, nodes) {
  const handle = entry.querySelector(".dynamic-card-head");
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
      // ignore pointer capture release failures
    }
    if (!moved) {
      state.selectedNodeId = nodeId;
      renderAll();
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
    ensureDynamicNodePositions();
    state.dynamicNodePositions[nodeId] = { x, y };

    const bounds = syncDynamicCanvasBounds(timeline);
    state.dynamicCanvasMetrics = bounds;
    applyCanvasZoom("dynamic", bounds);
    renderDynamicCanvasConnections(timeline, nodes, bounds);
  });

  handle.addEventListener("pointerup", finishDrag);
  handle.addEventListener("pointercancel", finishDrag);
}

function renderDetailPanel() {
  const node = getSelectedNode();
  const content = document.getElementById("detail-content");
  if (!node) {
    content.innerHTML = "";
    return;
  }

  detailTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.detailTab === state.activeDetailTab);
  });

  if (state.activeDetailTab === "event") {
    const extraWrites = (node.stateWrites || []).length
      ? `<h4>状态写入</h4><p>${node.stateWrites.join("<br>")}</p>`
      : "";
    content.innerHTML = `
      <div class="detail-block">
        <div class="detail-card">
          <h4>节点编号</h4>
          <p>${node.id}</p>
          <h4>节点标题</h4>
          <p>${node.title}</p>
          <h4>所属章节 / 幕次</h4>
          <p>${node.chapter} / ${node.act}</p>
          <h4>节点类型</h4>
          <p>${node.nodeType || "普通节点"}${node.endingLine ? ` / ${node.endingLine}` : ""}</p>
          <h4>事件简介</h4>
          <p>${node.summary || ""}</p>
          <h4>事件目标</h4>
          <p>${node.goal || ""}</p>
          ${extraWrites}
        </div>
      </div>
    `;
    return;
  }

  if (state.activeDetailTab === "decision") {
    content.innerHTML = `
      <div class="detail-block">
        ${(node.decisions || []).map((decision) => {
          const optionHtml = (decision.options || []).map((option) => `
            <div class="detail-option-block">
              <h5>${option.id} ${option.text}</h5>
              <p>${option.intent || ""}</p>
              <p><strong>状态变化：</strong>${(option.effects || []).join(" / ") || "无"}</p>
            </div>
          `).join("");

          return `
            <div class="detail-card">
              <h4>${decision.id} ${decision.title}</h4>
              <p>${decision.description || ""}</p>
              <p><strong>输入形式：</strong>${decision.inputType || "选择"}</p>
              ${optionHtml || '<p>当前决策没有选项定义。</p>'}
            </div>
          `;
        }).join("") || '<div class="detail-card"><p>当前节点没有决策定义。</p></div>'}
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="detail-block">
      ${(node.jumps || []).map((jump) => `
        <div class="detail-card">
          <h4>${jump.id}</h4>
          <p><strong>目标节点：</strong>${jump.target}</p>
          <p><strong>出口类型：</strong>${jump.type}</p>
          <p><strong>条件摘要：</strong>${jump.note || ""}</p>
          <p><strong>条件表达式：</strong>${jump.condition || ""}</p>
        </div>
      `).join("") || '<div class="detail-card"><p>当前节点没有跳转定义。</p></div>'}
    </div>
  `;
}

function renderPlaytest() {
  const playtest = state.studio?.playtest;
  if (!playtest) return;

  document.getElementById("playtest-title").textContent = `${playtest.nodeId} ${playtest.title}`;
  document.getElementById("playtest-text").innerHTML = (playtest.narrative || [])
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");
  document.getElementById("playtest-decision").textContent = `当前决策：${playtest.decisionLabel || ""}`;

  const options = document.getElementById("playtest-options");
  options.innerHTML = "";
  (playtest.options || []).forEach((option, index) => {
    const card = document.createElement("article");
    card.className = `play-option ${index % 2 === 0 ? "green" : "pink"}`;
    card.innerHTML = `<h4>${option.title}</h4><p>${option.summary}</p>`;
    options.appendChild(card);
  });

  const statusPanels = document.getElementById("status-panels");
  statusPanels.innerHTML = "";
  (playtest.statusPanels || []).forEach((panel) => {
    const wrapper = document.createElement("section");
    wrapper.className = "status-card";
    wrapper.innerHTML = `
      <h4>${panel.title}</h4>
      <ul>${(panel.items || []).map((item) => `<li>${item}</li>`).join("")}</ul>
    `;
      statusPanels.appendChild(wrapper);
    });
  }

function renderPlaytest() {
  const session = state.playtestSession;
  const playtest = session?.scene || state.studio?.playtest;
  if (!playtest) return;
  const currentNode = getNodeMap().get(session?.currentNodeId || playtest.nodeId) || null;
  const currentOptions = currentNode?.decisions?.[0]?.options || [];

  const title = document.getElementById("playtest-title");
  const text = document.getElementById("playtest-text");
  const decision = document.getElementById("playtest-decision");
  const options = document.getElementById("playtest-options");
  const routeMapContainer = document.getElementById("playtest-route-map");
  const statusPanels = document.getElementById("status-panels");
  const statusTabPanel = document.getElementById("playtest-tab-status");
  const mapTabPanel = document.getElementById("playtest-tab-map");
  const tabButtons = Array.from(document.querySelectorAll("[data-playtest-tab]"));
  const activePlaytestTab = state.playtestSideTab || "status";

  title.textContent = (!playtest.title || playtest.title === playtest.nodeId)
    ? playtest.nodeId
    : `${playtest.nodeId} ${playtest.title}`;

  text.innerHTML = "";
  if (session?.loading) {
    const loading = document.createElement("p");
    loading.className = "playtest-loading-text";
    loading.textContent = "正在根据当前节点与状态生成试玩描述...";
    text.appendChild(loading);
  } else {
    (playtest.narrative || []).forEach((paragraph) => {
      const element = document.createElement("p");
      element.textContent = paragraph;
      text.appendChild(element);
    });
    if (session?.error) {
      const note = document.createElement("p");
      note.className = "playtest-note";
      note.textContent = `当前使用本地回退描述：${session.error}`;
      text.appendChild(note);
    }
  }

  decision.textContent = `当前决策：${playtest.decisionLabel || ""}`;

  options.innerHTML = "";
  (playtest.options || []).forEach((option, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `play-option play-option-button ${index % 2 === 0 ? "green" : "pink"}`;
    card.dataset.playtestOptionId = option.id;
    card.disabled = Boolean(session?.loading);
    const sourceOption = currentOptions.find((item) => item.id === option.id);
    const summaryText = sanitizePlaytestOptionSummary(
      option.summary,
      sourceOption?.intent || ""
    );

    const heading = document.createElement("h4");
    heading.textContent = option.title;

    card.appendChild(heading);
    if (summaryText) {
      const summary = document.createElement("p");
      summary.textContent = summaryText;
      card.appendChild(summary);
    }
    options.appendChild(card);
  });

  if (routeMapContainer) {
    routeMapContainer.innerHTML = "";
    const routeMapCard = renderPlaytestRouteMap(playtest, session);
    if (routeMapCard) {
      routeMapContainer.appendChild(routeMapCard);
    }
  }

  if (statusTabPanel && mapTabPanel) {
    statusTabPanel.classList.toggle("hidden", activePlaytestTab !== "status");
    mapTabPanel.classList.toggle("hidden", activePlaytestTab !== "map");
  }
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.playtestTab === activePlaytestTab);
  });

  statusPanels.innerHTML = "";
  getRenderablePlaytestStatusPanels(playtest, session).forEach((panel) => {
    const wrapper = document.createElement("section");
    wrapper.className = "status-card";

    const heading = document.createElement("h4");
    heading.textContent = panel.title;
    const list = document.createElement("ul");
    (panel.items || []).forEach((item) => {
      const normalizedItem = parseLegacyPlaytestStatusItem(item);
      const listItem = document.createElement("li");

      const label = document.createElement("span");
      label.className = "status-item-label";
      label.textContent = normalizedItem.label;

      const valueGroup = document.createElement("span");
      valueGroup.className = "status-item-value-group";

      const value = document.createElement("span");
      value.className = "status-item-value";
      value.textContent = String(normalizedItem.value ?? "-");
      valueGroup.appendChild(value);

      if (Number.isFinite(Number(normalizedItem.delta)) && Number(normalizedItem.delta) !== 0) {
        const delta = document.createElement("span");
        delta.className = `status-item-delta ${Number(normalizedItem.delta) > 0 ? "is-positive" : "is-negative"}`;
        delta.textContent = formatPlaytestDelta(normalizedItem.delta);
        valueGroup.appendChild(delta);
      }

      listItem.appendChild(label);
      listItem.appendChild(valueGroup);
      list.appendChild(listItem);
    });

    wrapper.appendChild(heading);
    wrapper.appendChild(list);
    statusPanels.appendChild(wrapper);
  });
}

function renderAll() {
  if (!state.studio) {
    showScreen("start");
    return;
  }

  if (!state.selectedNodeId) {
    state.selectedNodeId = state.studio?.playtest?.nodeId || getAllNodes()[0]?.id || null;
  }

  renderIntent();
  renderStructure();
  renderDynamicCanvas();
  renderPlaytest();
  showScreen(state.activeScreen === "start" ? "intent" : state.activeScreen);
}

function setLoading(loading) {
  loadingOverlay.classList.toggle("hidden", !loading);
}

async function detectApi() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    apiStatus.textContent = data.openrouterConfigured
      ? `已连接 ${data.model}`
      : "未配置 Key，使用本地回退";
  } catch (error) {
    apiStatus.textContent = "API 检测失败";
  }
}

async function fetchStudioPayload(idea) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea })
  });
  return response.json();
}

function getCurrentIdea() {
  return document.getElementById("story-logline")?.value.trim()
    || state.studio?.logline
    || document.getElementById("idea-input")?.value.trim()
    || "";
}

function getNodesFromStudio(studio) {
  if (!studio?.structure?.chapters) return [];
  return studio.structure.chapters.flatMap((chapter) =>
    chapter.acts.flatMap((act) => act.nodes)
  );
}

function getNodeMap(studio = state.studio) {
  return new Map(getNodesFromStudio(studio).map((node) => [node.id, node]));
}

function getPlaytestStartNodeId() {
  return getDynamicOrderedNodes()[0]?.id || getAllNodes()[0]?.id || state.studio?.playtest?.nodeId || null;
}

function buildInitialPlaytestVariables(studio = state.studio) {
  const variables = {};
  Object.values(studio?.dynamic?.ledger || {}).forEach((items) => {
    (items || []).forEach((item) => {
      variables[item.name] = Number(item.initial) || 0;
    });
  });
  return variables;
}

function buildPlaytestStatusPanels(variables, studio = state.studio, lastVariableDiffs = {}) {
  return Object.entries(studio?.dynamic?.ledger || {}).map(([title, items]) => ({
    title,
    items: (items || []).map((item) => ({
      key: item.name,
      label: item.name,
      value: variables[item.name] ?? item.initial ?? "-",
      delta: Number.isFinite(Number(lastVariableDiffs?.[item.name])) && Number(lastVariableDiffs[item.name]) !== 0
        ? Number(lastVariableDiffs[item.name])
        : null
    }))
  }));
}

function buildPlaytestVariableDiffs(previousVariables, nextVariables, studio = state.studio) {
  const diffs = {};
  Object.values(studio?.dynamic?.ledger || {}).forEach((items) => {
    (items || []).forEach((item) => {
      const before = Number(previousVariables?.[item.name]);
      const after = Number(nextVariables?.[item.name]);
      if (!Number.isFinite(before) || !Number.isFinite(after)) return;
      const delta = Math.round((after - before) * 100) / 100;
      if (delta !== 0) {
        diffs[item.name] = delta;
      }
    });
  });
  return diffs;
}

function sanitizePlaytestOptionSummary(summary, fallbackText = "") {
  const normalizedSummary = String(summary || "").replace(/\s+/g, " ").trim();
  const normalizedFallback = String(fallbackText || "").replace(/\s+/g, " ").trim();
  if (!normalizedSummary) return normalizedFallback;

  const blockedPattern = /(?:^|[\s:：])(?:food|water|trust_level|coop_will|hidden_crisis|access_token|alert_level)\b|\d|[零一二三四五六七八九十百千万两]+(?:点|级|份|次|层|步|%)|[+\-]\s*\d|状态变化|数值|变量|信任度|合作意愿|隐藏危机|生存资源|食物|水源|警戒值|身份暴露/iu;
  if (blockedPattern.test(normalizedSummary)) {
    return normalizedFallback || "这会把局势推向新的方向，具体变化会在右侧状态栏里体现。";
  }

  return normalizedSummary;
}

function parseLegacyPlaytestStatusItem(item) {
  if (typeof item === "object" && item) {
    return {
      label: item.label || item.key || "",
      value: "value" in item ? item.value : "-",
      delta: Number.isFinite(Number(item.delta)) && Number(item.delta) !== 0 ? Number(item.delta) : null
    };
  }

  const text = String(item || "").trim();
  const match = text.match(/^([^:：]+)\s*[:：]\s*(.+)$/);
  if (match) {
    return {
      label: match[1].trim(),
      value: match[2].trim(),
      delta: null
    };
  }

  return {
    label: text,
    value: "",
    delta: null
  };
}

function getRenderablePlaytestStatusPanels(playtest, session = state.playtestSession) {
  if (session?.variables) {
    return buildPlaytestStatusPanels(
      session.variables,
      state.studio,
      session.lastVariableDiffs || {}
    );
  }

  return (playtest?.statusPanels || []).map((panel) => ({
    title: panel.title,
    items: (panel.items || []).map((item) => parseLegacyPlaytestStatusItem(item))
  }));
}

function formatPlaytestDelta(delta) {
  if (!Number.isFinite(Number(delta)) || Number(delta) === 0) return "";
  const normalized = Number(delta);
  const absValue = Math.abs(normalized);
  const display = Number.isInteger(absValue) ? String(absValue) : absValue.toFixed(2).replace(/\.?0+$/, "");
  return `${normalized > 0 ? "+" : "-"}${display}`;
}

function getPlaytestPathSequence(session = state.playtestSession) {
  const currentNodeId = session?.currentNodeId || session?.scene?.nodeId || state.studio?.playtest?.nodeId || null;
  const sequence = Array.isArray(session?.history)
    ? session.history.map((entry) => entry?.nodeId).filter(Boolean)
    : [];

  if (currentNodeId) {
    if (!sequence.length || sequence[sequence.length - 1] !== currentNodeId) {
      sequence.push(currentNodeId);
    }
  }

  return sequence;
}

function buildPlaytestRouteHighlight(session = state.playtestSession) {
  const sequence = getPlaytestPathSequence(session);
  const visitedNodeIds = new Set(sequence);
  const traversedEdgeKeys = new Set();

  for (let index = 0; index < sequence.length - 1; index += 1) {
    traversedEdgeKeys.add(`${sequence[index]}->${sequence[index + 1]}`);
  }

  return {
    sequence,
    visitedNodeIds,
    traversedEdgeKeys,
    currentNodeId: sequence[sequence.length - 1] || null
  };
}

function renderPlaytestRouteMap(playtest, session = state.playtestSession) {
  const graph = buildStructureGraphData();
  if (!graph.layoutNodes.length) return null;

  const { sequence, visitedNodeIds, traversedEdgeKeys, currentNodeId } = buildPlaytestRouteHighlight(session);
  const routeCard = document.createElement("section");
  routeCard.className = "status-card playtest-map-card";

  const header = document.createElement("div");
  header.className = "playtest-map-header";

  const heading = document.createElement("h4");
  heading.textContent = "实时路径图";

  const meta = document.createElement("div");
  meta.className = "playtest-map-meta";

  const currentBadge = document.createElement("span");
  currentBadge.className = "playtest-map-badge is-current";
  currentBadge.textContent = `当前：${currentNodeId || playtest?.nodeId || "-"}`;

  const progressBadge = document.createElement("span");
  progressBadge.className = "playtest-map-badge";
  progressBadge.textContent = `已走：${Math.max(sequence.length - 1, 0)} 步`;

  meta.appendChild(currentBadge);
  meta.appendChild(progressBadge);
  header.appendChild(heading);
  header.appendChild(meta);

  const stage = document.createElement("div");
  stage.className = "playtest-map-stage";

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "playtest-map-svg");
  svg.setAttribute("viewBox", `0 0 ${graph.width} ${graph.height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  graph.layoutEdges.forEach((edge) => {
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", edge.path);
    path.setAttribute(
      "class",
      `playtest-map-edge${traversedEdgeKeys.has(`${edge.fromId}->${edge.toId}`) ? " is-traversed" : ""}`
    );
    svg.appendChild(path);
  });

  graph.layoutNodes.forEach(({ node, x, y, palette, borderClass }) => {
    const group = document.createElementNS(svgNS, "g");
    group.setAttribute(
      "class",
      [
        "playtest-map-node",
        `graph-node-${palette}`,
        `graph-border-${borderClass}`,
        node.emptyNode ? "is-empty" : "",
        node.keyNode ? "is-key" : "",
        visitedNodeIds.has(node.id) ? "is-visited" : "",
        currentNodeId === node.id ? "is-current" : ""
      ].filter(Boolean).join(" ")
    );

    const size = getStructureNodeVisualSize(node);
    if (node.emptyNode) {
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", `${x - size / 2}`);
      rect.setAttribute("y", `${y}`);
      rect.setAttribute("width", `${size}`);
      rect.setAttribute("height", `${size}`);
      rect.setAttribute("rx", "5");
      rect.setAttribute("ry", "5");
      group.appendChild(rect);
    } else {
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", `${x}`);
      circle.setAttribute("cy", `${y + size / 2}`);
      circle.setAttribute("r", `${size / 2}`);
      group.appendChild(circle);
    }

    if (currentNodeId === node.id) {
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", `${x}`);
      label.setAttribute("y", `${y - 12}`);
      label.setAttribute("class", "playtest-map-label");
      label.textContent = node.id;
      group.appendChild(label);
    }

    svg.appendChild(group);
  });

  const hint = document.createElement("p");
  hint.className = "playtest-map-hint";
  hint.textContent = "亮线表示已走过的路径，发光节点表示你当前所在的位置。";

  stage.appendChild(svg);
  routeCard.appendChild(header);
  routeCard.appendChild(stage);
  routeCard.appendChild(hint);

  return routeCard;
}

function buildClientFallbackPlaytestScene(nodeId, runtimeState = {}) {
  const node = getNodeMap().get(nodeId) || getAllNodes()[0] || null;
  const primaryDecision = node?.decisions?.[0] || null;
  const lastChoiceText = runtimeState?.lastChoice?.text
    ? `上一轮你选择了“${runtimeState.lastChoice.text}”，它的影响还在继续发酵。`
    : "";
  const options = primaryDecision?.options?.length
    ? primaryDecision.options.map((option) => ({
        id: option.id,
        title: option.text || option.id,
        summary: option.intent || "这会把局势推向新的方向，具体变化会在右侧状态栏里体现。"
      }))
    : ((node?.jumps || []).length
        ? [{
            id: "__continue__",
            title: "继续推进",
            summary: "保持当前处境继续向前，看看局势会把你带到哪里。"
          }]
        : [{
            id: "__end__",
            title: "结束片段",
            summary: "这个试玩片段暂时在这里收束。"
          }]);

  return {
    nodeId: node?.id || "E1",
    title: node?.id || "试玩节点",
    narrative: [
      node?.summary || "你正站在一段新的情节入口，周围的局势还没有完全明朗。",
      node?.goal ? `此刻最现实的目标是：${node.goal}。` : "",
      lastChoiceText,
      primaryDecision?.options?.length
        ? "你知道每个选项都不只是行动方式的差异，它们也会让资源、关系和危机朝不同方向滑动。"
        : ((node?.jumps || []).length
            ? "眼下没有新的显式决策，但你此前累积的状态会决定下一段遭遇。"
            : "这一小段试玩已经走到末尾，你可以回看刚才是怎样一步步来到这里的。")
    ].filter(Boolean),
    decisionLabel: primaryDecision
      ? `${primaryDecision.id} ${primaryDecision.title}`
      : ((node?.jumps || []).length ? "继续推进" : "片段结束"),
    options,
    statusPanels: buildPlaytestStatusPanels(
      runtimeState.variables || buildInitialPlaytestVariables(),
      state.studio,
      runtimeState.lastVariableDiffs || {}
    )
  };
}

function ensurePlaytestSession(startNodeId) {
  if (!state.playtestSession || !state.playtestSession.currentNodeId) {
    state.playtestSession = {
      currentNodeId: startNodeId || getPlaytestStartNodeId(),
      variables: buildInitialPlaytestVariables(),
      history: [],
      lastChoice: null,
      lastVariableDiffs: {},
      scene: null,
      loading: false,
      error: ""
    };
  }
  if (!state.playtestSession.lastVariableDiffs) {
    state.playtestSession.lastVariableDiffs = {};
  }
  return state.playtestSession;
}

async function fetchPlaytestScenePayload(nodeId, runtimeState) {
  const response = await fetch("/api/playtest/scene", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studio: state.studio,
      nodeId,
      runtimeState
    })
  });
  return response.json();
}

function parseNumericExpression(text) {
  const value = Number(String(text || "").trim());
  return Number.isFinite(value) ? value : null;
}

function applyEffectStringToVariables(effect, variables) {
  const normalized = String(effect || "").trim();
  let match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*([+-])\s*(-?\d+(?:\.\d+)?)$/);
  if (match) {
    const [, key, operator, rawAmount] = match;
    const current = Number(variables[key] || 0);
    const amount = Number(rawAmount);
    variables[key] = operator === "+" ? current + amount : current - amount;
    return;
  }

  match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(-?\d+(?:\.\d+)?)$/);
  if (match) {
    const [, key, rawValue] = match;
    variables[key] = Number(rawValue);
  }
}

function applyStateWritesToVariables(node, variables) {
  (node?.stateWrites || []).forEach((write) => applyEffectStringToVariables(write, variables));
}

function evaluatePlaytestCondition(condition, variables) {
  const normalized = String(condition || "").trim();
  if (!normalized || /默认推进|结构出口/i.test(normalized)) {
    return true;
  }

  const parts = normalized.split(/\s*(?:且|并且|and)\s*/i).map((part) => part.trim()).filter(Boolean);
  const results = parts.map((part) => {
    const match = part.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(>=|<=|==|=|>|<)\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) return null;
    const [, key, operator, rawValue] = match;
    const left = Number(variables[key] || 0);
    const right = Number(rawValue);
    if (operator === ">=") return left >= right;
    if (operator === "<=") return left <= right;
    if (operator === ">" ) return left > right;
    if (operator === "<" ) return left < right;
    return left === right;
  });

  if (results.every((item) => typeof item === "boolean")) {
    return results.every(Boolean);
  }

  return false;
}

function resolveNextPlaytestNodeId(node, option, variables) {
  const jumps = Array.isArray(node?.jumps) ? node.jumps.filter((jump) => jump?.target) : [];
  if (!jumps.length) return null;
  if (jumps.length === 1) return jumps[0].target;

  const decisionOptions = node?.decisions?.[0]?.options || [];
  if (option && decisionOptions.length === jumps.length) {
    const optionIndex = decisionOptions.findIndex((item) => item.id === option.id);
    if (optionIndex >= 0 && jumps[optionIndex]?.target) {
      return jumps[optionIndex].target;
    }
  }

  const matched = jumps.find((jump) => evaluatePlaytestCondition(jump.condition, variables));
  if (matched?.target) return matched.target;

  const defaultJump = jumps.find((jump) => /默认推进|结构出口/i.test(String(jump.condition || "")));
  return defaultJump?.target || jumps[0]?.target || null;
}

async function loadPlaytestScene(nodeId, runtimeStateOverrides = {}) {
  const session = ensurePlaytestSession(nodeId);
  session.currentNodeId = nodeId || session.currentNodeId;
  session.variables = { ...session.variables, ...(runtimeStateOverrides.variables || {}) };
  if (runtimeStateOverrides.history) {
    session.history = runtimeStateOverrides.history;
  }
  if ("lastChoice" in runtimeStateOverrides) {
    session.lastChoice = runtimeStateOverrides.lastChoice;
  }
  if ("lastVariableDiffs" in runtimeStateOverrides) {
    session.lastVariableDiffs = runtimeStateOverrides.lastVariableDiffs || {};
  }

  session.loading = true;
  session.error = "";
  renderPlaytest();

  try {
    const payload = await fetchPlaytestScenePayload(session.currentNodeId, {
      variables: session.variables,
      history: session.history,
      lastChoice: session.lastChoice
    });
    session.scene = payload.scene || buildClientFallbackPlaytestScene(session.currentNodeId, session);
    session.error = payload.error || "";
  } catch (error) {
    session.scene = buildClientFallbackPlaytestScene(session.currentNodeId, session);
    session.error = error.message;
  } finally {
    session.loading = false;
    renderPlaytest();
  }
}

async function openPlaytestFromNode(nodeId, reset = true) {
  const startNodeId = nodeId || getPlaytestStartNodeId();
  if (!startNodeId) return;

  if (!reset && state.playtestSession?.currentNodeId) {
    state.selectedNodeId = state.playtestSession.currentNodeId;
    showScreen("playtest");
    renderPlaytest();
    return;
  }

  if (reset || !state.playtestSession) {
    state.playtestSession = {
      currentNodeId: startNodeId,
      variables: buildInitialPlaytestVariables(),
      history: [],
      lastChoice: null,
      lastVariableDiffs: {},
      scene: null,
      loading: false,
      error: ""
    };
  } else {
    state.playtestSession.currentNodeId = startNodeId;
  }

  state.selectedNodeId = startNodeId;
  showScreen("playtest");
  await loadPlaytestScene(startNodeId);
}

async function resumeOrStartPlaytest() {
  if (state.playtestSession?.currentNodeId) {
    await openPlaytestFromNode(state.playtestSession.currentNodeId, false);
    return;
  }
  await openPlaytestFromNode(getPlaytestStartNodeId(), true);
}

function exitPlaytest() {
  if (state.playtestSession?.currentNodeId) {
    state.selectedNodeId = state.playtestSession.currentNodeId;
  }
  state.playtestSession = null;
  state.playtestSideTab = "status";
  showScreen("dynamic");
}

async function handlePlaytestOption(optionId) {
  const session = ensurePlaytestSession();
  if (session.loading) return;

  const node = getNodeMap().get(session.currentNodeId);
  if (!node) return;

  const primaryDecision = node.decisions?.[0] || null;
  const option = primaryDecision?.options?.find((item) => item.id === optionId) || null;
  const previousVariables = { ...(session.variables || {}) };
  const nextVariables = { ...previousVariables };

  if (option) {
    (option.effects || []).forEach((effect) => applyEffectStringToVariables(effect, nextVariables));
  }
  applyStateWritesToVariables(node, nextVariables);
  const lastVariableDiffs = buildPlaytestVariableDiffs(previousVariables, nextVariables);

  const historyEntry = {
    nodeId: node.id,
    choiceId: optionId,
    text: option?.text || (optionId === "__continue__" ? "继续推进" : "结束片段")
  };
  const nextHistory = [...(session.history || []), historyEntry];
  const nextNodeId = resolveNextPlaytestNodeId(node, option, nextVariables);

  session.variables = nextVariables;
  session.history = nextHistory;
  session.lastChoice = historyEntry;
  session.lastVariableDiffs = lastVariableDiffs;

  if (!nextNodeId || optionId === "__end__") {
    session.scene = {
      nodeId: node.id,
      title: node.id,
      narrative: [
        node.settlement || "这段试玩内容暂时在这里结束。",
        "你刚才的选择已经在系统里留下痕迹，可以回到动力层继续审视这条路径。"
      ],
      decisionLabel: "片段结束",
      options: [],
      statusPanels: buildPlaytestStatusPanels(nextVariables, state.studio, lastVariableDiffs)
    };
    session.loading = false;
    renderPlaytest();
    return;
  }

  session.currentNodeId = nextNodeId;
  state.selectedNodeId = nextNodeId;
  await loadPlaytestScene(nextNodeId, {
    variables: nextVariables,
    history: nextHistory,
    lastChoice: historyEntry,
    lastVariableDiffs
  });
}

function rebuildStructureWithNodes(templateStructure, nodeMap) {
  return {
    ...templateStructure,
    chapters: (templateStructure?.chapters || []).map((chapter) => ({
      ...chapter,
      acts: (chapter.acts || []).map((act) => ({
        ...act,
        nodes: (act.nodes || []).map((node) => nodeMap.get(node.id) || node)
      }))
    }))
  };
}

async function generateStudio(idea) {
  const startedAt = Date.now();
  setLoading(true);

  try {
    const payload = await fetchStudioPayload(idea);
    state.studio = payload.data || payload.fallback || payload;
    state.selectedNodeId = state.studio?.playtest?.nodeId || getAllNodes()[0]?.id || null;
    state.expandedDynamicIds = getDefaultExpandedDynamicIds();
      state.structureNodePositions = {};
      state.dynamicNodePositions = {};
      state.structureZoom = 1;
      state.dynamicZoom = 1;
      state.playtestSession = null;
      state.allLayersGenerated = false;
      state.activeScreen = "intent";
      state.intentEditing = {
      theme: false,
      conflicts: false,
      stateMatrix: false
    };
    const remain = 1100 - (Date.now() - startedAt);
    if (remain > 0) {
      await new Promise((resolve) => setTimeout(resolve, remain));
    }
    renderAll();
  } catch (error) {
    alert(`生成失败：${error.message}`);
  } finally {
    setLoading(false);
  }
}

async function regenerateStructureLayer() {
  if (!state.studio) return;
  setLoading(true);

  try {
    updateStudioFromIntentInputs();
    const payload = await fetchStudioPayload(getCurrentIdea());
    const fresh = payload.data || payload.fallback || payload;
    const currentNodeMap = new Map(getAllNodes().map((node) => [node.id, node]));
    const freshNodes = getNodesFromStudio(fresh);
    const mergedNodes = new Map(
      freshNodes.map((freshNode) => {
        const currentNode = currentNodeMap.get(freshNode.id);
        if (!currentNode) {
          return [freshNode.id, freshNode];
        }

        return [freshNode.id, {
          ...currentNode,
          id: freshNode.id,
          title: freshNode.title,
          chapter: freshNode.chapter,
          act: freshNode.act,
          nodeType: freshNode.nodeType,
          endingLine: freshNode.endingLine ?? null,
          emptyNode: Boolean(freshNode.emptyNode),
          keyNode: Boolean(freshNode.keyNode)
        }];
      })
    );

    const previousSelectedId = state.selectedNodeId;
    state.studio.structure = rebuildStructureWithNodes(fresh.structure, mergedNodes);
      state.selectedNodeId = mergedNodes.has(previousSelectedId)
        ? previousSelectedId
        : getAllNodes()[0]?.id || null;
      state.structureNodePositions = {};
      state.dynamicNodePositions = {};
      state.playtestSession = null;
      renderAll();
      showScreen("structure");
  } catch (error) {
    alert(`结构层重新生成失败：${error.message}`);
  } finally {
    setLoading(false);
  }
}

async function regenerateDynamicLayer() {
  if (!state.studio) return;
  setLoading(true);

  try {
    updateStudioFromIntentInputs();
    const payload = await fetchStudioPayload(getCurrentIdea());
    const fresh = payload.data || payload.fallback || payload;
    const freshNodeMap = new Map(getNodesFromStudio(fresh).map((node) => [node.id, node]));

    getAllNodes().forEach((node) => {
      const freshNode = freshNodeMap.get(node.id);
      if (!freshNode) return;
      node.summary = freshNode.summary || "";
      node.goal = freshNode.goal || "";
      node.decisions = Array.isArray(freshNode.decisions) ? freshNode.decisions : [];
      node.jumps = Array.isArray(freshNode.jumps) ? freshNode.jumps : [];
      node.stateWrites = Array.isArray(freshNode.stateWrites) ? freshNode.stateWrites : [];
      node.tags = Array.isArray(freshNode.tags) ? freshNode.tags : node.tags;
    });

    if (fresh.dynamic) {
      state.studio.dynamic = fresh.dynamic;
    }
    if (fresh.playtest && getAllNodes().some((node) => node.id === fresh.playtest.nodeId)) {
      state.studio.playtest = fresh.playtest;
    }

      const previousSelectedId = state.selectedNodeId;
      state.expandedDynamicIds = getDefaultExpandedDynamicIds();
      state.dynamicNodePositions = {};
      state.playtestSession = null;
      state.selectedNodeId = getAllNodes().some((node) => node.id === previousSelectedId)
        ? previousSelectedId
        : state.studio?.playtest?.nodeId || getAllNodes()[0]?.id || null;
    renderAll();
    showScreen("dynamic");
  } catch (error) {
    alert(`动力层重新生成失败：${error.message}`);
  } finally {
    setLoading(false);
  }
}

async function regenerateIntentPanel(panel) {
  if (!state.studio) return;
  setLoading(true);
  try {
    const payload = await fetchStudioPayload(document.getElementById("story-logline").value.trim());
    const fresh = payload.data || payload.fallback || payload;
    if (panel === "theme") state.studio.theme = fresh.theme || state.studio.theme;
    if (panel === "conflicts") state.studio.conflictSystem = fresh.conflictSystem || state.studio.conflictSystem;
    if (panel === "stateMatrix") state.studio.stateMatrix = fresh.stateMatrix || state.studio.stateMatrix;
    setIntentEditing(panel, false);
    renderIntent();
  } catch (error) {
    alert(`重新生成失败：${error.message}`);
  } finally {
    setLoading(false);
  }
}

function updateStudioFromIntentInputs() {
  if (!state.studio) return;
  state.studio.logline = document.getElementById("story-logline").value.trim();
  state.studio.experienceGoal = normalizeExperienceGoal(state.studio.experienceGoal);
  state.studio.experienceGoal.emotionCurve = document.getElementById("emotion-curve").value.trim();
  state.studio.experienceGoal.interactionType = document.getElementById("interaction-type").value.trim();
}

function addStructureConnectionDraft() {
  const node = getSelectedNode();
  const addSelect = document.getElementById("structure-connection-target");
  if (!node || !addSelect?.value) return;

  const targets = readStructureConnectionTargets(node.id);
  targets.push(addSelect.value);
  renderStructureConnectionEditor(node.id, targets);
}

function removeStructureConnectionDraft(index) {
  const node = getSelectedNode();
  if (!node) return;

  const targets = readStructureConnectionTargets(node.id).filter((_, itemIndex) => itemIndex !== index);
  renderStructureConnectionEditor(node.id, targets);
}

function saveIntentPanel(panel) {
  if (!state.studio) return;

  if (panel === "theme") {
    state.studio.theme = document.getElementById("theme-editor").value.trim();
  }

  if (panel === "conflicts") {
    state.studio.conflictSystem = document
      .getElementById("conflict-editor")
      .value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (panel === "stateMatrix") {
    state.studio.stateMatrix = parseStateMatrixInput(document.getElementById("state-editor").value);
  }

  setIntentEditing(panel, false);
  renderIntent();
}

function saveCurrentNode() {
  const node = getSelectedNode();
  if (!node) return;

  const previousId = node.id;
  const nextId = document.getElementById("node-name").value.trim() || node.id;
  if (nextId !== previousId && getAllNodes().some((item) => item.id === nextId)) {
    alert("\u8282\u70b9\u540d\u5df2\u5b58\u5728\uff0c\u8bf7\u6362\u4e00\u4e2a\u7f16\u53f7\u3002");
    return;
  }

  const targetIds = readStructureConnectionTargets(previousId);

  node.id = nextId;
  node.chapter = document.getElementById("node-chapter-select").value;
  node.act = document.getElementById("node-act-select").value;
  node.emptyNode = document.getElementById("node-empty").checked;
  node.keyNode = document.getElementById("node-key").checked;
  node.nodeType = resolveStructureNodeType(node);

  renameNodeReferences(previousId, nextId);
  setStructureNodeTargets(node.id, targetIds.map((targetId) => (targetId === previousId ? nextId : targetId)));
  state.selectedNodeId = node.id;
  renderAll();
}

function addNode() {
  if (!state.studio?.structure?.chapters?.length) return;

  const chapter = state.studio.structure.chapters[0];
  const act = chapter.acts[0];
  const nextIndex = getAllNodes().length + 1;
  const node = {
    id: `E${String(nextIndex).padStart(2, "0")}`,
    title: "新节点",
    summary: "请补充事件简介。",
    goal: "请补充事件目标。",
    chapter: chapter.name,
    act: act.name,
      tags: ["new"],
      nodeType: "\u666e\u901a\u8282\u70b9",
      keyNode: false,
    emptyNode: false,
    decisions: [],
    jumps: []
  };

  act.nodes.push(node);
  ensureExplicitStructureEdges(getAllNodes());
  if (!Array.isArray(state.studio.dynamic?.order)) {
    state.studio.dynamic = {
      ...(state.studio.dynamic || {}),
      order: []
    };
  }
  if (!state.studio.dynamic.order.includes(node.id)) {
    state.studio.dynamic.order.push(node.id);
  }
  state.selectedNodeId = node.id;
  renderAll();
}

function bindEvents() {
  document.getElementById("idea-form").addEventListener("submit", (event) => {
    event.preventDefault();
    generateStudio(document.getElementById("idea-input").value.trim());
  });

  intentScreen.addEventListener("click", (event) => {
    const button = event.target.closest("[data-intent-action]");
    if (!button) return;

    const panel = button.dataset.panel;
    const action = button.dataset.intentAction;

    if (action === "edit") {
      setIntentEditing(panel, true);
      renderIntent();
      return;
    }

    if (action === "save") {
      saveIntentPanel(panel);
      return;
    }

    if (action === "regenerate") {
      regenerateIntentPanel(panel);
    }
  });

  detailTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeDetailTab = tab.dataset.detailTab;
      renderDetailPanel();
    });
  });

  document.getElementById("goto-structure").addEventListener("click", () => {
    updateStudioFromIntentInputs();
    showScreen("structure");
  });
    document.getElementById("exit-playtest").addEventListener("click", exitPlaytest);
    document.getElementById("story-logline").addEventListener("change", updateStudioFromIntentInputs);
    document.getElementById("emotion-curve").addEventListener("change", updateStudioFromIntentInputs);
    document.getElementById("interaction-type").addEventListener("change", updateStudioFromIntentInputs);

    structureScreen.addEventListener("click", (event) => {
      const target = event.target.closest("button");
      if (!target) return;

      if (target.id === "goto-dynamic") {
      state.allLayersGenerated = true;
      showScreen("dynamic");
    }

      if (target.id === "save-node") {
        saveCurrentNode();
      }

      if (target.id === "add-structure-connection") {
        addStructureConnectionDraft();
      }

      if (target.dataset.removeConnection) {
        removeStructureConnectionDraft(Number(target.dataset.removeConnection));
      }

      if (target.id === "add-node") {
        addNode();
      }

    if (target.id === "reset-structure") {
      regenerateStructureLayer();
    }

    if (target.id === "structure-zoom-in") {
      changeCanvasZoom("structure", 0.1);
    }

    if (target.id === "structure-zoom-out") {
      changeCanvasZoom("structure", -0.1);
    }

    if (target.id === "structure-zoom-reset") {
      resetCanvasZoom("structure");
    }
  });

      dynamicScreen.addEventListener("click", async (event) => {
        const target = event.target.closest("button");
        if (!target) return;

        if (target.id === "goto-playtest") {
          await resumeOrStartPlaytest();
        }

      if (target.id === "regenerate-dynamic") {
        regenerateDynamicLayer();
      }

    if (target.id === "dynamic-zoom-in") {
      changeCanvasZoom("dynamic", 0.1);
    }

    if (target.id === "dynamic-zoom-out") {
      changeCanvasZoom("dynamic", -0.1);
    }

      if (target.id === "dynamic-zoom-reset") {
        resetCanvasZoom("dynamic");
      }
    });

    playtestScreen.addEventListener("click", async (event) => {
      const tabButton = event.target.closest("[data-playtest-tab]");
      if (tabButton) {
        state.playtestSideTab = tabButton.dataset.playtestTab || "status";
        renderPlaytest();
        return;
      }

      const button = event.target.closest("[data-playtest-option-id]");
      if (!button) return;
      await handlePlaytestOption(button.dataset.playtestOptionId);
    });
  }

bindEvents();
detectApi();
renderAll();
