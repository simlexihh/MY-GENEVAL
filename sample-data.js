const sampleSeed = {
  userIdea:
    "荒岛求生的玩家，在与其他幸存者的相处中，选择“独自生存保障自身”或“合作求生共渡难关”，不同选择会触发荒岛隐藏危机的不同解锁方式。",
  intent: {
    theme: "在荒岛求生的困境中，个人生存与集体合作的选择影响着危机的走向",
    conflicts: [
      "独自生存保障自身 vs 合作求生共渡难关",
      "物资有限 vs 协作需求",
      "个人安全 vs 集体责任",
      "信任建立 vs 猜忌滋生"
    ],
    stateMatrix: {
      "生存资源": ["食物", "水源"],
      "人际关系": ["信任度", "合作意愿"],
      "危机状态": ["隐藏危机解锁程度"]
    },
    experienceGoal: {
      emotionCurve: "升—降—升",
      interactionType: "阶段裁决型"
    }
  },
  structure: {
    overview: {
      mainStrategy: "以个人生存与集体合作的选择为主线，通过物资、人际关系等子矛盾展开分歧与汇流",
      contraction: "建置阶段强收缩，发展阶段中收缩，后段关键分歧弱收缩",
      branchRecovery: "发展阶段设置多层分支，重要分歧维持2-4个节点后汇流，部分分支形成两层以上连续分化",
      endingSplit: "在第五章中途通过终局入口节点分化出4条终局线，各终局线有清晰路径差异并以空白节点结束"
    },
    chapters: [
      { id: "chapter-1", name: "第一章", stage: "建置" },
      { id: "chapter-2", name: "第二章", stage: "建置" },
      { id: "chapter-3", name: "第三章", stage: "发展" },
      { id: "chapter-4", name: "第四章", stage: "发展" },
      { id: "chapter-5", name: "第五章", stage: "发展" },
      { id: "chapter-6", name: "第六章", stage: "终局" }
    ],
    nodes: [
      { id: "E1", chapter: 1, act: "ACT1", endingLine: null, type: "普通节点", targets: ["E2"] },
      { id: "E2", chapter: 1, act: "ACT2", endingLine: null, type: "分支节点", targets: ["E3", "E4"] },
      { id: "E3", chapter: 1, act: "ACT3", endingLine: null, type: "普通节点", targets: ["E5"] },
      { id: "E4", chapter: 1, act: "ACT3", endingLine: null, type: "普通节点", targets: ["E5"] },
      { id: "E5", chapter: 2, act: "ACT1", endingLine: null, type: "汇合节点", targets: ["E6"] },
      { id: "E6", chapter: 2, act: "ACT2", endingLine: null, type: "分支节点", targets: ["E7", "E8"] },
      { id: "E7", chapter: 2, act: "ACT3", endingLine: null, type: "普通节点", targets: ["E9"] },
      { id: "E8", chapter: 2, act: "ACT3", endingLine: null, type: "普通节点", targets: ["E10"] },
      { id: "E9", chapter: 3, act: "ACT1", endingLine: null, type: "分支节点", targets: ["E11", "E12"] },
      { id: "E10", chapter: 3, act: "ACT1", endingLine: null, type: "普通节点", targets: ["E13"] },
      { id: "E11", chapter: 3, act: "ACT2", endingLine: null, type: "普通节点", targets: ["E14"] },
      { id: "E12", chapter: 3, act: "ACT2", endingLine: null, type: "空白节点", targets: ["E15"] },
      { id: "E13", chapter: 3, act: "ACT3", endingLine: null, type: "汇合节点", targets: ["E16"] },
      { id: "E14", chapter: 3, act: "ACT3", endingLine: null, type: "普通节点", targets: ["E16"] },
      { id: "E15", chapter: 4, act: "ACT1", endingLine: null, type: "普通节点", targets: ["E17"] },
      { id: "E16", chapter: 4, act: "ACT1", endingLine: null, type: "分支节点", targets: ["E18", "E19"] },
      { id: "E17", chapter: 4, act: "ACT2", endingLine: null, type: "空白节点", targets: ["E20"] },
      { id: "E18", chapter: 4, act: "ACT2", endingLine: null, type: "普通节点", targets: ["E20"] },
      { id: "E19", chapter: 4, act: "ACT3", endingLine: null, type: "汇合节点", targets: ["E21"] },
      { id: "E20", chapter: 5, act: "ACT1", endingLine: null, type: "终局入口节点", targets: ["E22", "E23", "E24"] },
      { id: "E21", chapter: 5, act: "ACT2", endingLine: "L1", type: "普通节点", targets: ["E25"] },
      { id: "E22", chapter: 5, act: "ACT2", endingLine: "L2", type: "普通节点", targets: ["E26"] },
      { id: "E23", chapter: 5, act: "ACT2", endingLine: "L3", type: "普通节点", targets: ["E27"] },
      { id: "E24", chapter: 5, act: "ACT2", endingLine: "L4", type: "普通节点", targets: ["E28"] },
      { id: "E25", chapter: 6, act: "ACT1", endingLine: "L1", type: "普通节点", targets: ["E29"] },
      { id: "E26", chapter: 6, act: "ACT1", endingLine: "L2", type: "普通节点", targets: ["E30"] },
      { id: "E27", chapter: 6, act: "ACT1", endingLine: "L3", type: "普通节点", targets: ["E31"] },
      { id: "E28", chapter: 6, act: "ACT1", endingLine: "L4", type: "普通节点", targets: ["E32"] },
      { id: "E29", chapter: 6, act: "ACT2", endingLine: "L1", type: "空白节点", targets: [] },
      { id: "E30", chapter: 6, act: "ACT2", endingLine: "L2", type: "空白节点", targets: [] },
      { id: "E31", chapter: 6, act: "ACT2", endingLine: "L3", type: "空白节点", targets: [] },
      { id: "E32", chapter: 6, act: "ACT2", endingLine: "L4", type: "空白节点", targets: [] }
    ]
  },
  ledger: {
    "生存资源": [
      { name: "food", kind: "整数", range: "0-100", initial: 50, note: "荒岛生存中的食物存量" },
      { name: "water", kind: "整数", range: "0-100", initial: 50, note: "荒岛生存中的水源存量" }
    ],
    "人际关系": [
      { name: "trust_level", kind: "整数", range: "0-100", initial: 30, note: "与其他幸存者的信任度" },
      { name: "coop_will", kind: "整数", range: "0-100", initial: 40, note: "自身的合作意愿程度" }
    ],
    "危机状态": [
      { name: "hidden_crisis", kind: "整数", range: "0-100", initial: 0, note: "隐藏危机的解锁程度" }
    ]
  }
};

const dynamicNodes = [
  {
    id: "E1",
    type: "普通节点",
    summary: "初到荒岛，发现基础生存物资",
    goal: "初步获取生存资源并建立初始关系",
    decisions: [
      {
        id: "D1",
        title: "分配初始物资",
        inputType: "选择",
        options: [
          {
            id: "C1",
            text: "独自占有大部分物资",
            intent: "倾向个人生存",
            effects: ["food +20", "water +20", "trust_level -10"]
          },
          {
            id: "C2",
            text: "平均分配物资给其他幸存者",
            intent: "倾向集体合作",
            effects: ["food +10", "water +10", "trust_level +10"]
          }
        ]
      }
    ],
    settlement: "完成初始物资分配，影响信任度与资源存量",
    jumps: [{ condition: "默认推进", target: "E2" }]
  },
  {
    id: "E2",
    type: "分支节点",
    summary: "面临是否加入幸存者营地的选择",
    goal: "决定是否与其他幸存者合作",
    decisions: [
      {
        id: "D2",
        title: "是否加入营地",
        inputType: "选择",
        options: [
          {
            id: "C3",
            text: "拒绝加入，独自生存",
            intent: "强化个人生存路线",
            effects: ["coop_will -20"]
          },
          {
            id: "C4",
            text: "同意加入，共同建立营地",
            intent: "强化集体合作路线",
            effects: ["coop_will +20"]
          }
        ]
      }
    ],
    settlement: "确定生存路线，影响合作意愿",
    jumps: [
      { condition: "解锁标记包含'独自路线'", target: "E3" },
      { condition: "解锁标记包含'合作路线'", target: "E4" }
    ]
  },
  {
    id: "E3",
    type: "普通节点",
    summary: "独自探索荒岛，获取稀缺物资",
    goal: "补充个人生存资源",
    decisions: [
      {
        id: "D3",
        title: "探索危险区域",
        inputType: "选择",
        options: [
          {
            id: "C5",
            text: "冒险进入危险区域获取大量物资",
            intent: "高风险高收益",
            effects: ["food +30", "water +30", "hidden_crisis +15"]
          },
          {
            id: "C6",
            text: "稳妥探索安全区域获取基础物资",
            intent: "低风险低收益",
            effects: ["food +10", "water +10", "hidden_crisis +5"]
          }
        ]
      }
    ],
    settlement: "完成独自探索，获取资源并可能触发隐藏危机",
    jumps: [{ condition: "默认推进", target: "E5" }]
  },
  {
    id: "E4",
    type: "普通节点",
    summary: "参与营地协作，分配劳动任务",
    goal: "提升集体协作效率与信任度",
    decisions: [
      {
        id: "D4",
        title: "选择协作任务",
        inputType: "选择",
        options: [
          {
            id: "C7",
            text: "承担高难度的狩猎任务",
            intent: "展现能力提升信任",
            effects: ["trust_level +15", "coop_will +10"]
          },
          {
            id: "C8",
            text: "选择轻松的采集任务",
            intent: "避免风险但收益较低",
            effects: ["trust_level +5", "coop_will +5"]
          }
        ]
      }
    ],
    settlement: "完成协作任务，影响信任度与合作意愿",
    jumps: [{ condition: "默认推进", target: "E5" }]
  },
  {
    id: "E5",
    type: "汇合节点",
    summary: "不同生存路线的幸存者首次汇合，交流生存情况",
    goal: "回灌前序选择对资源与关系的影响",
    decisions: [],
    settlement: "汇合后根据前序选择调整后续协作基础",
    stateWrites: [
      "trust_level = 前序trust_level * 0.8 + 新交互影响",
      "coop_will = 前序coop_will * 0.7 + 新交互影响"
    ],
    jumps: [{ condition: "默认推进", target: "E6" }]
  },
  {
    id: "E6",
    type: "分支节点",
    summary: "营地出现物资短缺，决定分配方案",
    goal: "解决物资短缺问题并引发新的矛盾",
    decisions: [
      {
        id: "D5",
        title: "物资分配方案选择",
        inputType: "选择",
        options: [
          {
            id: "C9",
            text: "优先保障核心成员物资",
            intent: "维持小团体利益",
            effects: ["trust_level -15", "coop_will -10"]
          },
          {
            id: "C10",
            text: "平均分配所有幸存者物资",
            intent: "维护集体公平",
            effects: ["trust_level +10", "coop_will +15"]
          }
        ]
      }
    ],
    settlement: "确定物资分配方案，加剧信任与合作矛盾",
    jumps: [
      { condition: "解锁标记包含'小团体分配'", target: "E7" },
      { condition: "解锁标记包含'公平分配'", target: "E8" }
    ]
  },
  {
    id: "E7",
    type: "普通节点",
    summary: "小团体与其他幸存者产生冲突，决定处理方式",
    goal: "处理冲突并影响后续关系",
    decisions: [
      {
        id: "D6",
        title: "冲突处理方式",
        inputType: "选择",
        options: [
          {
            id: "C11",
            text: "武力压制反对者",
            intent: "强硬手段解决冲突",
            effects: ["trust_level -20", "coop_will -15"]
          },
          {
            id: "C12",
            text: "协商妥协重新分配",
            intent: "缓和矛盾寻求和解",
            effects: ["trust_level +5", "coop_will +10"]
          }
        ]
      }
    ],
    settlement: "处理冲突，严重影响信任度与合作意愿",
    jumps: [{ condition: "默认推进", target: "E9" }]
  },
  {
    id: "E8",
    type: "普通节点",
    summary: "集体协作成功获取新物资，庆祝活动选择",
    goal: "巩固集体关系并提升合作意愿",
    decisions: [
      {
        id: "D7",
        title: "庆祝活动形式",
        inputType: "选择",
        options: [
          {
            id: "C13",
            text: "举办隆重庆祝活动增强凝聚力",
            intent: "强化集体认同",
            effects: ["trust_level +20", "coop_will +20"]
          },
          {
            id: "C14",
            text: "简单庆祝节省资源",
            intent: "务实路线",
            effects: ["food -5", "water -5", "trust_level +10"]
          }
        ]
      }
    ],
    settlement: "完成庆祝活动，提升信任度与合作意愿",
    jumps: [{ condition: "默认推进", target: "E10" }]
  },
  {
    id: "E9",
    type: "分支节点",
    summary: "发现神秘洞穴，决定是否深入探索",
    goal: "触发隐藏危机并产生新分歧",
    decisions: [
      {
        id: "D8",
        title: "洞穴探索决策",
        inputType: "选择",
        options: [
          {
            id: "C15",
            text: "带领小团体独自探索洞穴",
            intent: "争夺潜在资源",
            effects: ["trust_level -15", "hidden_crisis +20"]
          },
          {
            id: "C16",
            text: "提议集体制定探索计划",
            intent: "协作应对未知危机",
            effects: ["coop_will +15", "hidden_crisis +10"]
          }
        ]
      }
    ],
    settlement: "决定洞穴探索方式，影响隐藏危机解锁与关系",
    jumps: [
      { condition: "解锁标记包含'独自洞穴探索'", target: "E11" },
      { condition: "解锁标记包含'集体洞穴探索'", target: "E12" }
    ]
  },
  {
    id: "E10",
    type: "普通节点",
    summary: "集体规划长期生存方案，选择发展方向",
    goal: "确定生存策略并积累资源",
    decisions: [
      {
        id: "D9",
        title: "生存策略选择",
        inputType: "选择",
        options: [
          {
            id: "C17",
            text: "优先建立防御工事保障安全",
            intent: "侧重安全防御",
            effects: ["food -10", "water -10", "trust_level +10"]
          },
          {
            id: "C18",
            text: "优先开拓农田保证食物供应",
            intent: "侧重资源生产",
            effects: ["food +15", "coop_will +15"]
          }
        ]
      }
    ],
    settlement: "确定长期生存策略，消耗或增加资源并影响关系",
    jumps: [{ condition: "默认推进", target: "E13" }]
  },
  {
    id: "E11",
    type: "普通节点",
    summary: "小团体在洞穴中发现危险生物，紧急应对",
    goal: "决定如何应对洞穴中的高风险威胁",
    decisions: [
      {
        id: "D10",
        title: "危险生物应对方式",
        inputType: "选择",
        options: [
          {
            id: "C19",
            text: "击杀生物获取资源",
            intent: "获取资源但可能引发更大危机",
            effects: ["food +25", "hidden_crisis +30"]
          },
          {
            id: "C20",
            text: "撤离洞穴避免冲突",
            intent: "规避风险但放弃资源",
            effects: ["hidden_crisis +10"]
          }
        ]
      }
    ],
    settlement: "应对危险生物，影响资源与隐藏危机解锁程度",
    jumps: [{ condition: "默认推进", target: "E14" }]
  },
  {
    id: "E12",
    type: "空白节点",
    summary: "集体洞穴探索的过程细节由状态变量动态生成",
    goal: "根据隐藏危机、信任度和合作意愿展开团队协作细节",
    decisions: [],
    settlement: "读取状态后生成团队协作过程，并导向后续发展",
    jumps: [{ condition: "结构出口", target: "E15" }]
  },
  {
    id: "E13",
    type: "汇合节点",
    summary: "不同探索路线的幸存者再次汇合，交流洞穴发现",
    goal: "根据汇合交流结果调整危机应对策略",
    decisions: [],
    settlement: "汇合后根据洞穴探索结果调整危机应对策略",
    stateWrites: [
      "hidden_crisis = 前序hidden_crisis * 1.2 + 汇合交流影响",
      "trust_level = 前序trust_level * 0.9 + 汇合交流影响"
    ],
    jumps: [{ condition: "默认推进", target: "E16" }]
  },
  {
    id: "E14",
    type: "普通节点",
    summary: "小团体因洞穴危机与集体产生隔阂，决定是否修复关系",
    goal: "决定是否主动修复与集体之间的信任",
    decisions: [
      {
        id: "D11",
        title: "关系修复决策",
        inputType: "选择",
        options: [
          {
            id: "C21",
            text: "主动分享洞穴资源以表诚意",
            intent: "修复信任",
            effects: ["food -15", "trust_level +20"]
          },
          {
            id: "C22",
            text: "继续保持独立拒绝妥协",
            intent: "维持隔阂",
            effects: ["trust_level -10", "coop_will -10"]
          }
        ]
      }
    ],
    settlement: "决定是否修复关系，影响信任度与合作意愿",
    jumps: [{ condition: "默认推进", target: "E16" }]
  },
  {
    id: "E15",
    type: "普通节点",
    summary: "集体根据洞穴探索情报制定危机应对计划",
    goal: "确定应对隐藏危机的总体方案",
    decisions: [
      {
        id: "D12",
        title: "危机应对计划选择",
        inputType: "选择",
        options: [
          {
            id: "C23",
            text: "建立预警系统监控危险区域",
            intent: "预防危机",
            effects: ["hidden_crisis -10", "coop_will +15"]
          },
          {
            id: "C24",
            text: "储备物资准备撤离荒岛",
            intent: "逃避危机",
            effects: ["food -20", "water -20", "trust_level -5"]
          }
        ]
      }
    ],
    settlement: "确定危机应对计划，影响隐藏危机与资源存量",
    jumps: [{ condition: "默认推进", target: "E17" }]
  },
  {
    id: "E16",
    type: "分支节点",
    summary: "营地爆发信任危机，有人怀疑资源分配不公",
    goal: "处理信任危机并决定团队是否维持协作",
    decisions: [
      {
        id: "D13",
        title: "信任危机处理方式",
        inputType: "选择",
        options: [
          {
            id: "C25",
            text: "公开物资账本证明清白",
            intent: "透明化处理重建信任",
            effects: ["trust_level +25"]
          },
          {
            id: "C26",
            text: "指责他人挑拨拒绝解释",
            intent: "激化矛盾",
            effects: ["trust_level -25"]
          }
        ]
      }
    ],
    settlement: "处理信任危机，极大影响信任度",
    jumps: [
      { condition: "trust_level >= 60", target: "E18" },
      { condition: "trust_level < 60", target: "E19" }
    ]
  },
  {
    id: "E17",
    type: "空白节点",
    summary: "撤离准备的具体过程会根据资源存量与信任度动态生成",
    goal: "读取资源与关系状态，生成撤离准备的具体情节",
    decisions: [],
    settlement: "根据当前状态展开撤离准备，并导向终局入口",
    jumps: [{ condition: "结构出口", target: "E20" }]
  },
  {
    id: "E18",
    type: "普通节点",
    summary: "信任修复后集体决定共同面对危机",
    goal: "选择后续协作方案并承担对应代价",
    decisions: [
      {
        id: "D14",
        title: "危机应对协作方案",
        inputType: "选择",
        options: [
          {
            id: "C27",
            text: "组建侦察队深入调查危险源头",
            intent: "主动解决危机",
            effects: ["coop_will +20", "hidden_crisis +15"]
          },
          {
            id: "C28",
            text: "加固营地等待救援",
            intent: "被动等待救援",
            effects: ["food -10", "water -10"]
          }
        ]
      }
    ],
    settlement: "确定协作方案，影响合作意愿与资源消耗",
    jumps: [{ condition: "默认推进", target: "E20" }]
  },
  {
    id: "E19",
    type: "汇合节点",
    summary: "信任破裂后部分幸存者脱离集体，剩余人员重整计划",
    goal: "在团队分裂后重新调整生存策略",
    decisions: [],
    settlement: "信任破裂导致团队分裂，调整生存策略",
    stateWrites: [
      "trust_level = 前序trust_level * 0.5",
      "coop_will = 前序coop_will * 0.6"
    ],
    jumps: [{ condition: "默认推进", target: "E21" }]
  },
  {
    id: "E20",
    type: "终局入口节点",
    summary: "根据整体生存状态与关系决定进入不同终局线",
    goal: "执行终局前的状态裁决并分流至对应结局",
    decisions: [],
    settlement: "终局裁决前的状态汇总",
    jumps: [
      { condition: "trust_level >= 70 且 coop_will >= 60", target: "E22" },
      { condition: "trust_level < 30 且 coop_will < 40", target: "E23" },
      { condition: "hidden_crisis >= 60", target: "E24" },
      { condition: "默认推进", target: "E21" }
    ]
  },
  {
    id: "E21",
    type: "普通节点",
    summary: "在L1终局线中，团队协作成功化解危机并等待救援",
    goal: "锁定合作结局并确认团队协作成果",
    decisions: [],
    settlement: "团队协作路线的最终确认，锁定合作结局",
    stateWrites: ["trust_level = 100", "coop_will = 100"],
    jumps: [{ condition: "默认推进", target: "E25" }]
  },
  {
    id: "E22",
    type: "普通节点",
    summary: "在L2终局线中，高信任度团队成功建立可持续生存基地",
    goal: "锁定繁荣结局并确认高信任合作状态",
    decisions: [],
    settlement: "高信任合作路线的最终确认，锁定繁荣结局",
    stateWrites: ["food = 80", "water = 80"],
    jumps: [{ condition: "默认推进", target: "E26" }]
  },
  {
    id: "E23",
    type: "普通节点",
    summary: "在L3终局线中，信任破裂导致团队瓦解各自为战",
    goal: "锁定混乱结局并确认团队分裂状态",
    decisions: [],
    settlement: "低信任分裂路线的最终确认，锁定混乱结局",
    stateWrites: ["trust_level = 20", "coop_will = 20"],
    jumps: [{ condition: "默认推进", target: "E27" }]
  },
  {
    id: "E24",
    type: "普通节点",
    summary: "在L4终局线中，隐藏危机爆发导致全员陷入绝境",
    goal: "锁定灾难结局并确认危机全面爆发",
    decisions: [],
    settlement: "高危机解锁路线的最终确认，锁定灾难结局",
    stateWrites: ["hidden_crisis = 100"],
    jumps: [{ condition: "默认推进", target: "E28" }]
  },
  {
    id: "E25",
    type: "普通节点",
    summary: "L1终局线的最后准备，确认团队协作成果",
    goal: "确认合作结局的最终状态",
    decisions: [],
    settlement: "确认团队协作的最终状态",
    jumps: [{ condition: "默认推进", target: "E29" }]
  },
  {
    id: "E26",
    type: "普通节点",
    summary: "L2终局线的繁荣结局展示，资源充足关系和谐",
    goal: "确认繁荣结局的最终状态",
    decisions: [],
    settlement: "确认繁荣结局的最终状态",
    jumps: [{ condition: "默认推进", target: "E30" }]
  },
  {
    id: "E27",
    type: "普通节点",
    summary: "L3终局线的混乱结局展示，信任崩塌生存艰难",
    goal: "确认混乱结局的最终状态",
    decisions: [],
    settlement: "确认混乱结局的最终状态",
    jumps: [{ condition: "默认推进", target: "E31" }]
  },
  {
    id: "E28",
    type: "普通节点",
    summary: "L4终局线的灾难结局展示，隐藏危机全面爆发",
    goal: "确认灾难结局的最终状态",
    decisions: [],
    settlement: "确认灾难结局的最终状态",
    jumps: [{ condition: "默认推进", target: "E32" }]
  },
  {
    id: "E29",
    type: "空白节点",
    summary: "根据团队信任度与合作意愿生成救援成功的不同细节",
    goal: "读取信任度与合作意愿，扩展合作结局的细部表现",
    decisions: [],
    settlement: "L1终局的最终细节由状态驱动生成",
    jumps: []
  },
  {
    id: "E30",
    type: "空白节点",
    summary: "根据资源存量生成可持续生存基地的不同发展方向",
    goal: "读取资源状态，扩展繁荣结局的细部表现",
    decisions: [],
    settlement: "L2终局的最终细节由资源状态驱动生成",
    jumps: []
  },
  {
    id: "E31",
    type: "空白节点",
    summary: "根据信任度与合作意愿生成团队瓦解后的不同生存场景",
    goal: "读取关系状态，扩展混乱结局的细部表现",
    decisions: [],
    settlement: "L3终局的最终细节由关系状态驱动生成",
    jumps: []
  },
  {
    id: "E32",
    type: "空白节点",
    summary: "根据隐藏危机解锁程度生成灾难爆发的不同惨烈程度",
    goal: "读取危机状态，扩展灾难结局的细部表现",
    decisions: [],
    settlement: "L4终局的最终细节由危机状态驱动生成",
    jumps: []
  }
];

const chapterNameMap = new Map(sampleSeed.structure.chapters.map((chapter) => [chapter.id, chapter.name]));
const actOrder = ["ACT1", "ACT2", "ACT3"];
const emotionCurveMap = {
  "升—降—升": "升-降-升",
  "升-降-升": "升-降-升"
};
const interactionTypeMap = {
  "\u9636\u6bb5\u88c1\u51b3\u578b": "\u9636\u6bb5\u88c1\u51b3\u578b",
  "\u51b3\u65ad\u4f53\u9a8c": "\u9636\u6bb5\u88c1\u51b3\u578b",
  "\u9ad8\u538b\u8d23\u4efb\u4f53\u9a8c": "\u9ad8\u538b\u8d23\u4efb\u578b",
  "\u9ad8\u538b\u8d23\u4efb\u578b": "\u9ad8\u538b\u8d23\u4efb\u578b",
  "\u63a2\u7d22\u63a8\u8fdb\u4f53\u9a8c": "\u63a2\u7d22\u53d9\u4e8b\u578b",
  "\u63a2\u7d22\u53d9\u4e8b\u578b": "\u63a2\u7d22\u53d9\u4e8b\u578b",
  "\u63a8\u7406\u5224\u65ad\u578b": "\u63a8\u7406\u5224\u65ad\u578b",
  "\u8d44\u6e90\u7ba1\u7406\u578b": "\u8d44\u6e90\u7ba1\u7406\u578b",
  "\u5173\u7cfb\u6743\u8861\u578b": "\u5173\u7cfb\u6743\u8861\u578b"
};

function formatNodeTitle(node) {
  const source = node.summary || node.goal || `${node.id} ${node.type}`;
  return source.split(/[，。；：]/)[0] || `${node.id} ${node.type}`;
}

function toStateMatrix(stateMatrix) {
  return Object.entries(stateMatrix).map(([category, items]) => ({
    category,
    description: items.join("、")
  }));
}

function normalizeEmotionCurve(value) {
  return emotionCurveMap[value] || value || "先降后升";
}

function normalizeInteractionType(value) {
  return interactionTypeMap[value] || value || "\u9636\u6bb5\u88c1\u51b3\u578b";
}

function buildJumpList(node) {
  return (node.jumps || []).map((jump, index) => ({
    id: `J${index + 1}`,
    target: jump.target,
    type: jump.condition === "默认推进" ? "默认" : "条件",
    condition: jump.condition,
    note: jump.condition
  }));
}

function buildDecisionList(node) {
  return (node.decisions || []).map((decision) => ({
    id: decision.id,
    title: decision.title,
    description: (decision.options || [])
      .map((option) => `${option.id} ${option.text}：${option.intent}`)
      .join("；"),
    effects: (decision.options || [])
      .flatMap((option) => (option.effects || []).map((effect) => {
        const parts = effect.split(/\s+/);
        return { key: `${option.id} ${parts[0]}`, value: parts.slice(1).join(" ") || "" };
      })),
    options: decision.options || [],
    inputType: decision.inputType || "选择"
  }));
}

function buildStatusPanels() {
  return Object.entries(sampleSeed.ledger).map(([title, items]) => ({
    title,
    items: items.map((item) => `${item.name}: ${item.initial}`)
  }));
}

function buildPlaytest(nodesById) {
  const node = nodesById.get("E2") || nodesById.values().next().value;
  const firstDecision = node?.decisions?.[0];
  return {
    nodeId: node?.id || "E1",
    title: node?.title || "关键节点",
    narrative: [
      node?.summary || "",
      node?.goal ? `节点目标：${node.goal}` : "",
      "你需要根据当前资源与关系状态，做出会持续影响后续危机走向的选择。"
    ].filter(Boolean),
    decisionLabel: firstDecision ? `${firstDecision.id} ${firstDecision.title}` : "",
    options: (firstDecision?.options || []).map((option) => ({
      id: option.id,
      title: option.text,
      summary: option.intent || "这会把局势推向新的方向，具体变化会在右侧状态栏里体现。"
    })),
    statusPanels: buildStatusPanels()
  };
}

function buildStructureChapters(nodesById) {
  return sampleSeed.structure.chapters.map((chapter) => ({
    id: chapter.id,
    name: chapter.name,
    stage: chapter.stage,
    acts: actOrder.map((act) => ({
      id: `${chapter.id}-${act.toLowerCase()}`,
      name: act,
      nodes: sampleSeed.structure.nodes
        .filter((node) => node.chapter === Number(chapter.id.split("-")[1]) && node.act === act)
        .map((node) => nodesById.get(node.id))
        .filter(Boolean)
    }))
  }));
}

function buildStructureEdges() {
  return sampleSeed.structure.nodes.flatMap((node) =>
    (node.targets || []).map((target) => ({
      from: node.id,
      to: target,
      kind: node.type === "分支节点" || node.type === "终局入口节点" ? "branch" : "main"
    }))
  );
}

function buildCanonicalNodes() {
  const structureMap = new Map(sampleSeed.structure.nodes.map((node) => [node.id, node]));
  return dynamicNodes.map((node) => {
    const structure = structureMap.get(node.id);
    const chapterName = chapterNameMap.get(`chapter-${structure.chapter}`) || `第${structure.chapter}章`;
    return {
      id: node.id,
      title: formatNodeTitle(node),
      summary: node.summary,
      goal: node.goal,
      chapter: chapterName,
      act: structure.act,
      tags: [node.type, structure.endingLine || null].filter(Boolean),
      keyNode: structure.type === "终局入口节点",
      emptyNode: structure.type === "空白节点",
      nodeType: structure.type,
      endingLine: structure.endingLine,
      decisions: buildDecisionList(node),
      jumps: buildJumpList(node),
      settlement: node.settlement || "",
      stateWrites: node.stateWrites || []
    };
  });
}

function buildSampleStudioData(userIdea = sampleSeed.userIdea) {
  const canonicalNodes = buildCanonicalNodes();
  const structureMap = new Map(canonicalNodes.map((node) => [node.id, node]));
  const structureNodes = sampleSeed.structure.nodes
    .map((node) => structureMap.get(node.id))
    .filter(Boolean);

  return {
    title: "荒岛求生：独存或协作",
    logline: userIdea || sampleSeed.userIdea,
    theme: sampleSeed.intent.theme,
    conflictSystem: sampleSeed.intent.conflicts,
    stateMatrix: toStateMatrix(sampleSeed.intent.stateMatrix),
    experienceGoal: {
      emotionCurve: normalizeEmotionCurve(sampleSeed.intent.experienceGoal.emotionCurve),
      interactionType: normalizeInteractionType(sampleSeed.intent.experienceGoal.interactionType)
    },
    structure: {
      overview: sampleSeed.structure.overview,
      chapters: buildStructureChapters(structureMap),
      edges: buildStructureEdges()
    },
    dynamic: {
      ledger: sampleSeed.ledger,
      order: sampleSeed.structure.nodes.map((node) => node.id),
      defaultExpandedNodeIds: []
    },
    playtest: buildPlaytest(structureMap)
  };
}

module.exports = {
  sampleUserIdea: sampleSeed.userIdea,
  buildSampleStudioData
};
