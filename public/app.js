const appShell = document.getElementById("app-shell");
const navList = document.getElementById("nav-list");

const screens = {
  start: document.getElementById("start-screen"),
  intent: document.getElementById("intent-screen"),
  structure: document.getElementById("structure-screen"),
  dynamic: document.getElementById("dynamic-screen"),
  playtest: document.getElementById("playtest-screen")
};

const detailTabs = Array.from(document.querySelectorAll(".detail-tab"));
const loadingOverlay = document.getElementById("loading-overlay");
const apiStatus = document.getElementById("api-status");

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
    { screen: "structure", label: "结构层" },
    { screen: "dynamic", label: "动力层" },
    { screen: "playtest", label: "试玩", cta: true }
  ],
  playtest: [
    { screen: "structure", label: "结构层" },
    { screen: "dynamic", label: "动力层" },
    { screen: "playtest", label: "试玩", cta: true }
  ]
};

const defaultState = {
  studio: null,
  selectedNodeId: null,
  activeScreen: "start",
  activeDetailTab: "event"
};

let state = loadState();

function loadState() {
  return { ...defaultState };
}

function persistState() {
  return;
}

function renderSidebar(activeScreen) {
  const currentScreen = activeScreen || state.activeScreen;
  const layout = sidebarLayouts[currentScreen] || [];

  appShell.classList.toggle("start-mode", currentScreen === "start");
  navList.innerHTML = "";

  layout.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `nav-item${item.cta ? " nav-item-cta" : ""}`;
    button.textContent = item.label;

    if (item.screen === currentScreen) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      if (!state.studio) return;
      showScreen(item.screen);
    });

    navList.appendChild(button);
  });
}

function showScreen(name) {
  state.activeScreen = name;
  Object.entries(screens).forEach(([key, el]) => el.classList.toggle("hidden", key !== name));
  renderSidebar(name);
  persistState();
}

function getAllNodes() {
  if (!state.studio?.structure?.chapters) return [];
  return state.studio.structure.chapters.flatMap((chapter) => chapter.acts.flatMap((act) => act.nodes));
}

function getSelectedNode() {
  const nodes = getAllNodes();
  return nodes.find((node) => node.id === state.selectedNodeId) || nodes[0] || null;
}

function renderIntent() {
  if (!state.studio) return;
  document.getElementById("story-logline").value = state.studio.logline || "";
  document.getElementById("theme-text").textContent = state.studio.theme || "";
  document.getElementById("emotion-curve").value = state.studio.experienceGoal?.emotionCurve || "";
  document.getElementById("interaction-type").value = state.studio.experienceGoal?.interactionType || "";

  const conflictList = document.getElementById("conflict-list");
  conflictList.innerHTML = "";
  (state.studio.conflictSystem || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    conflictList.appendChild(li);
  });

  const matrix = document.getElementById("state-matrix");
  matrix.innerHTML = "";
  (state.studio.stateMatrix || []).forEach((row) => {
    const wrapper = document.createElement("div");
    wrapper.className = "matrix-row";
    wrapper.innerHTML = `<strong>${row.category}</strong><span>${row.description}</span>`;
    matrix.appendChild(wrapper);
  });
}

function renderStructure() {
  const chapters = state.studio?.structure?.chapters || [];
  const chapterTabs = document.getElementById("chapter-tabs");
  chapterTabs.innerHTML = "";
  chapters.forEach((chapter) => {
    const pill = document.createElement("div");
    pill.className = "chapter-pill";
    pill.textContent = chapter.name;
    chapterTabs.appendChild(pill);
  });

  const canvas = document.getElementById("structure-canvas");
  canvas.innerHTML = "";

  chapters.forEach((chapter) => {
    chapter.acts.forEach((act) => {
      const group = document.createElement("section");
      group.className = "act-group";
      group.innerHTML = `<div class="act-title">${chapter.name} / ${act.name}</div>`;

      const list = document.createElement("div");
      list.className = "node-list";
      act.nodes.forEach((node) => {
        const card = document.createElement("article");
        card.className = "node-card";
        if (node.id === state.selectedNodeId) card.classList.add("active");
        card.innerHTML = `
          <div class="node-head">${node.id} ${node.title}</div>
          <div class="node-body">
            <div>${node.summary}</div>
            <div><strong>目标：</strong>${node.goal || ""}</div>
            <div class="node-tags">${(node.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
          </div>
        `;
        card.addEventListener("click", () => {
          state.selectedNodeId = node.id;
          persistState();
          renderAll();
        });
        list.appendChild(card);
      });
      group.appendChild(list);
      canvas.appendChild(group);
    });
  });

  renderPropertyPanel();
}

function renderPropertyPanel() {
  const node = getSelectedNode();
  if (!node) return;
  document.getElementById("node-id").value = node.id || "";
  document.getElementById("node-title").value = node.title || "";
  document.getElementById("node-chapter").value = node.chapter || "";
  document.getElementById("node-act").value = node.act || "";
  document.getElementById("node-empty").checked = Boolean(node.emptyNode);
  document.getElementById("node-key").checked = Boolean(node.keyNode);
}

function renderDynamic() {
  const timeline = document.getElementById("dynamic-timeline");
  timeline.innerHTML = "";
  getAllNodes().forEach((node) => {
    const card = document.createElement("article");
    card.className = "timeline-node";
    if (node.id === state.selectedNodeId) card.classList.add("active");
    card.innerHTML = `
      <div class="timeline-node-head">${node.id} ${node.title}</div>
      <div class="timeline-node-body">
        <div><strong>事件简介</strong></div>
        <div>${node.summary || ""}</div>
        <div><strong>事件目标</strong></div>
        <div>${node.goal || ""}</div>
        <div><strong>决策点</strong></div>
        <div>${(node.decisions || []).map((item) => `${item.id} ${item.title}`).join("<br>") || "无"}</div>
      </div>
    `;
    card.addEventListener("click", () => {
      state.selectedNodeId = node.id;
      persistState();
      renderAll();
    });
    timeline.appendChild(card);
  });
  renderDetailPanel();
}

function renderDetailPanel() {
  const node = getSelectedNode();
  const content = document.getElementById("detail-content");
  if (!node) {
    content.innerHTML = "";
    return;
  }

  detailTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.detailTab === state.activeDetailTab));

  if (state.activeDetailTab === "event") {
    content.innerHTML = `
      <div class="detail-block">
        <div class="detail-card">
          <h4>节点编号</h4>
          <p>${node.id}</p>
          <h4>节点标题</h4>
          <p>${node.title}</p>
          <h4>所属章节 / 幕次</h4>
          <p>${node.chapter} / ${node.act}</p>
          <h4>事件简介</h4>
          <p>${node.summary}</p>
          <h4>事件目标</h4>
          <p>${node.goal}</p>
        </div>
      </div>
    `;
    return;
  }

  if (state.activeDetailTab === "decision") {
    content.innerHTML = `
      <div class="detail-block">
        ${(node.decisions || []).map((decision) => `
          <div class="detail-card">
            <h4>${decision.id} ${decision.title}</h4>
            <p>${decision.description || ""}</p>
            <p><strong>状态变化：</strong>${(decision.effects || []).map((effect) => `${effect.key}: ${effect.value}`).join(" / ")}</p>
          </div>
        `).join("") || '<div class="detail-card"><p>当前节点没有决策定义。</p></div>'}
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
  document.getElementById("playtest-text").innerHTML = (playtest.narrative || []).map((paragraph) => `<p>${paragraph}</p>`).join("");
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
    wrapper.innerHTML = `<h4>${panel.title}</h4><ul>${(panel.items || []).map((item) => `<li>${item}</li>`).join("")}</ul>`;
    statusPanels.appendChild(wrapper);
  });
}

function renderAll() {
  if (!state.studio) {
    showScreen("start");
    return;
  }
  if (!state.selectedNodeId) state.selectedNodeId = getAllNodes()[0]?.id || null;
  renderIntent();
  renderStructure();
  renderDynamic();
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
    apiStatus.textContent = data.openrouterConfigured ? `已连接 ${data.model}` : "未配置 Key，使用本地回退";
  } catch (error) {
    apiStatus.textContent = "API 检测失败";
  }
}

async function generateStudio(idea) {
  setLoading(true);
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea })
    });
    const payload = await response.json();
    state.studio = payload.data || payload.fallback || payload;
    state.selectedNodeId = state.studio?.playtest?.nodeId || getAllNodes()[0]?.id || null;
    state.activeScreen = "intent";
    persistState();
    renderAll();
  } catch (error) {
    alert("生成失败：" + error.message);
  } finally {
    setLoading(false);
  }
}

function updateStudioFromIntentInputs() {
  if (!state.studio) return;
  state.studio.logline = document.getElementById("story-logline").value.trim();
  state.studio.experienceGoal = state.studio.experienceGoal || {};
  state.studio.experienceGoal.emotionCurve = document.getElementById("emotion-curve").value.trim();
  state.studio.experienceGoal.interactionType = document.getElementById("interaction-type").value.trim();
  persistState();
}

function saveCurrentNode() {
  const node = getSelectedNode();
  if (!node) return;
  node.id = document.getElementById("node-id").value.trim() || node.id;
  node.title = document.getElementById("node-title").value.trim();
  node.chapter = document.getElementById("node-chapter").value.trim();
  node.act = document.getElementById("node-act").value.trim();
  node.emptyNode = document.getElementById("node-empty").checked;
  node.keyNode = document.getElementById("node-key").checked;
  persistState();
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
    keyNode: false,
    emptyNode: false,
    decisions: [],
    jumps: []
  };
  act.nodes.push(node);
  state.selectedNodeId = node.id;
  persistState();
  renderAll();
}

document.getElementById("idea-form").addEventListener("submit", (event) => {
  event.preventDefault();
  generateStudio(document.getElementById("idea-input").value.trim());
});

detailTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeDetailTab = tab.dataset.detailTab;
    persistState();
    renderDetailPanel();
  });
});

document.getElementById("goto-structure").addEventListener("click", () => {
  updateStudioFromIntentInputs();
  showScreen("structure");
});
document.getElementById("goto-dynamic").addEventListener("click", () => showScreen("dynamic"));
document.getElementById("goto-playtest").addEventListener("click", () => showScreen("playtest"));
document.getElementById("exit-playtest").addEventListener("click", () => showScreen("dynamic"));
document.getElementById("save-node").addEventListener("click", saveCurrentNode);
document.getElementById("add-node").addEventListener("click", addNode);
document.getElementById("add-dynamic-node").addEventListener("click", addNode);
document.getElementById("reset-structure").addEventListener("click", () => generateStudio(state.studio?.logline || ""));
document.getElementById("regenerate-intent").addEventListener("click", () => generateStudio(document.getElementById("story-logline").value.trim()));
document.getElementById("regenerate-dynamic").addEventListener("click", () => generateStudio(state.studio?.logline || ""));
document.getElementById("story-logline").addEventListener("change", updateStudioFromIntentInputs);
document.getElementById("emotion-curve").addEventListener("change", updateStudioFromIntentInputs);
document.getElementById("interaction-type").addEventListener("change", updateStudioFromIntentInputs);

detectApi();
renderAll();
