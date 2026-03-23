# TriStage Narrative Studio Data Spec

## 1. Intent Layer

### 1.1 Source fields

- `logline`
- `theme`
- `conflictSystem[]`
- `stateMatrix[]`
- `experienceGoal.emotionCurve`
- `experienceGoal.interactionType`

### 1.2 Display rules

- `logline` maps to the long input box at the top of the intent screen.
- `theme` maps to the "主控思想" card.
- `conflictSystem[]` maps to the "矛盾系统" card, one line per item.
- `stateMatrix[]` maps to the "状态参数表" card, one row per item.
- `experienceGoal.emotionCurve` maps to the emotion-curve select.
- `experienceGoal.interactionType` maps to the interaction-style select.

### 1.3 Experience enums

`experienceGoal.emotionCurve` must be one of:

- `持续上升`
- `持续下降`
- `先升后降`
- `先降后升`
- `升-降-升`
- `降-升-降`

`experienceGoal.interactionType` must be one of:

- `高压责任体验`
- `决断体验`
- `探索推进体验`

## 2. Structure Layer

### 2.1 Source fields

- `structure.chapters[].acts[].nodes[]`
- `structure.edges[]`

### 2.2 Node fields

- `id`
- `title`
- `summary`
- `goal`
- `chapter`
- `act`
- `keyNode`
- `emptyNode`

### 2.3 Edge fields

Each edge item must follow:

```json
{
  "from": "E01",
  "to": "E02",
  "kind": "main"
}
```

`kind` can be:

- `main`
- `branch`
- `merge`

### 2.4 Display rules

- The structure canvas must use `structure.edges[]` as the primary connection source.
- When `structure.edges[]` exists, the frontend should not invent alternative connections.
- `chapter` controls the node fill palette.
- `act` controls the node border color:
  - `ACT1`: light gray
  - `ACT2`: medium gray
  - `ACT3`: dark gray-blue
- `emptyNode = true` renders as a square node.
- `keyNode = true` renders with highlighted emphasis.

## 3. Dynamic Layer

### 3.1 Source fields

- `dynamic.order[]`
- `dynamic.defaultExpandedNodeIds[]`
- `structure.chapters[].acts[].nodes[]`

### 3.2 Display rules

- `dynamic.order[]` defines the left-to-right / top-to-bottom card sequence.
- `dynamic.defaultExpandedNodeIds[]` defines which cards start expanded.
- The dynamic card body is rendered from the matching node:
  - `summary`
  - `goal`
  - `decisions[]`
  - `jumps[]`
- Card-to-card connection lines follow `dynamic.order[]`.

## 4. Playtest Layer

### 4.1 Source fields

- `playtest.nodeId`
- `playtest.title`
- `playtest.narrative[]`
- `playtest.decisionLabel`
- `playtest.options[]`
- `playtest.statusPanels[]`

### 4.2 Display rules

- `nodeId + title` map to the playtest page title bar.
- `narrative[]` renders as ordered narrative paragraphs.
- `decisionLabel` renders as the current decision label.
- `options[]` render as clickable decision cards.
- `statusPanels[]` render on the right-side status board.

## 5. Minimum payload example

```json
{
  "logline": "在人工智能统治下，一个记者寻找真相。",
  "theme": "真相的代价高于真相本身。",
  "conflictSystem": [
    "揭露真相 vs 维持秩序"
  ],
  "stateMatrix": [
    {
      "category": "关系",
      "description": "线人信任、同伴信任"
    }
  ],
  "experienceGoal": {
    "emotionCurve": "先降后升",
    "interactionType": "高压责任体验"
  },
  "structure": {
    "chapters": [],
    "edges": []
  },
  "dynamic": {
    "order": [],
    "defaultExpandedNodeIds": []
  },
  "playtest": {
    "nodeId": "E01",
    "title": "试玩节点",
    "narrative": [],
    "decisionLabel": "D1",
    "options": [],
    "statusPanels": []
  }
}
```
