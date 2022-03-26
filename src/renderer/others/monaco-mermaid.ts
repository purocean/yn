// https://unpkg.com/monaco-mermaid/browser.js

export default function (monacoEditor: any) {
  monacoEditor.languages.register({ id: 'mermaid' })

  const requirementDiagrams = [
    'requirement',
    'functionalRequirement',
    'interfaceRequirement',
    'performanceRequirement',
    'physicalRequirement',
    'designConstraint'
  ]
  const keywords = {
    flowchart: {
      typeKeywords: ['flowchart', 'flowchart-v2', 'graph'],
      blockKeywords: ['subgraph', 'end'],
      keywords: [
        'TB',
        'TD',
        'BT',
        'RL',
        'LR',
        'click',
        'call',
        'href',
        '_self',
        '_blank',
        '_parent',
        '_top',
        'linkStyle',
        'style',
        'classDef',
        'class',
        'direction',
        'interpolate'
      ]
    },
    sequenceDiagram: {
      typeKeywords: ['sequenceDiagram'],
      blockKeywords: [
        'alt',
        'par',
        'and',
        'loop',
        'else',
        'end',
        'rect',
        'opt',
        'alt',
        'rect'
      ],
      keywords: [
        'participant',
        'as',
        'Note',
        'note',
        'right of',
        'left of',
        'over',
        'activate',
        'deactivate',
        'autonumber',
        'title',
        'actor'
      ]
    },
    classDiagram: {
      typeKeywords: ['classDiagram', 'classDiagram-v2'],
      blockKeywords: ['class'],
      keywords: [
        'link',
        'click',
        'callback',
        'call',
        'href',
        'cssClass',
        'direction',
        'TB',
        'BT',
        'RL',
        'LR'
      ]
    },
    stateDiagram: {
      typeKeywords: ['stateDiagram', 'stateDiagram-v2'],
      blockKeywords: ['state', 'note', 'end'],
      keywords: [
        'state',
        'as',
        'hide empty description',
        'direction',
        'TB',
        'BT',
        'RL',
        'LR'
      ]
    },
    erDiagram: {
      typeKeywords: ['erDiagram'],
      blockKeywords: [],
      keywords: []
    },
    journey: {
      typeKeywords: ['journey'],
      blockKeywords: ['section'],
      keywords: ['title']
    },
    info: {
      typeKeywords: ['info'],
      blockKeywords: [],
      keywords: ['showInfo']
    },
    gantt: {
      typeKeywords: ['gantt'],
      blockKeywords: [],
      keywords: [
        'title',
        'dateFormat',
        'axisFormat',
        'todayMarker',
        'section',
        'excludes',
        'inclusiveEndDates'
      ]
    },
    requirementDiagram: {
      typeKeywords: ['requirement', 'requirementDiagram'],
      blockKeywords: requirementDiagrams.concat('element'),
      keywords: []
    },
    gitGraph: {
      typeKeywords: ['gitGraph'],
      blockKeywords: [],
      keywords: ['commit', 'branch', 'merge', 'reset', 'checkout', 'LR', 'BT']
    },
    pie: {
      typeKeywords: ['pie'],
      blockKeywords: [],
      keywords: ['title', 'showData']
    }
  }

  const __assign = Object.assign

  monacoEditor.languages.setMonarchTokensProvider('mermaid', __assign(__assign({}, Object.entries(keywords)
    .map(function (entry) {
      return Object.fromEntries(Object.entries(entry[1]).map(function (deepEntry) {
        return [
          entry[0] + deepEntry[0][0].toUpperCase() + deepEntry[0].slice(1),
          deepEntry[1]
        ]
      }))
    })
    .reduce(function (overallKeywords, nextKeyword) { return (__assign(__assign({}, overallKeywords), nextKeyword)) }, {})), {
    tokenizer: {
      root: [
        [/%%(?=.*%%$)/, { token: 'string', nextEmbedded: 'json' }],
        [/%%$/, { token: 'string', nextEmbedded: '@pop' }],
        [/^\s*gitGraph/m, 'typeKeyword', 'gitGraph'],
        [/^\s*info/m, 'typeKeyword', 'info'],
        [/^\s*pie/m, 'typeKeyword', 'pie'],
        [/^\s*(flowchart|flowchart-v2|graph)/m, 'typeKeyword', 'flowchart'],
        [/^\s*sequenceDiagram/, 'typeKeyword', 'sequenceDiagram'],
        [/^\s*classDiagram(-v2)?/, 'typeKeyword', 'classDiagram'],
        [/^\s*journey/, 'typeKeyword', 'journey'],
        [/^\s*gantt/, 'typeKeyword', 'gantt'],
        [/^\s*stateDiagram(-v2)?/, 'typeKeyword', 'stateDiagram'],
        [/^\s*er(Diagram)?/, 'typeKeyword', 'erDiagram'],
        [/^\s*requirement(Diagram)?/, 'typeKeyword', 'requirementDiagram'],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, 'comment']
      ],
      gitGraph: [
        [/option(?=s)/, { token: 'typeKeyword', next: 'optionsGitGraph' }],
        [/(^\s*branch|reset|merge|checkout)(.*$)/, ['keyword', 'variable']],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              '@gitGraphBlockKeywords': 'typeKeyword',
              '@gitGraphKeywords': 'keyword'
            }
          }
        ],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, 'comment'],
        [/".*?"/, 'string'],
        [/\^/, 'delimiter.bracket']
      ],
      optionsGitGraph: [
        [
          /s$/,
          {
            token: 'typeKeyword',
            nextEmbedded: 'json',
            matchOnlyAtLineStart: false
          }
        ],
        ['end', { token: 'typeKeyword', next: '@pop', nextEmbedded: '@pop' }]
      ],
      info: [
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              '@infoBlockKeywords': 'typeKeyword',
              '@infoKeywords': 'keyword'
            }
          }
        ]
      ],
      pie: [
        [/(title)(.*$)/, ['keyword', 'string']],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              '@pieBlockKeywords': 'typeKeyword',
              '@pieKeywords': 'keyword'
            }
          }
        ],
        [/".*?"/, 'string'],
        [/\s*\d+/, 'number'],
        [/:/, 'delimiter.bracket'],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, 'comment']
      ],
      flowchart: [
        [/[ox]?(--+|==+)[ox]/, 'transition'],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              '@flowchartBlockKeywords': 'typeKeyword',
              '@flowchartKeywords': 'keyword',
              '@default': 'variable'
            }
          }
        ],
        [/\|+.+?\|+/, 'string'],
        [/\[+(\\.+?[\\/]|\/.+?[/\\])\]+/, 'string'],
        [/[[>]+[^\]|[]+?\]+/, 'string'],
        [/{+.+?}+/, 'string'],
        [/\(+.+?\)+/, 'string'],
        [/-\.+->?/, 'transition'],
        [
          /(-[-.])([^->][^-]+?)(-{3,}|-{2,}>|\.-+>)/,
          ['transition', 'string', 'transition']
        ],
        [/(==+)([^=]+?)(={3,}|={2,}>)/, ['transition', 'string', 'transition']],
        [/<?(--+|==+)>|===+|---+/, 'transition'],
        [/:::/, 'transition'],
        [/[;&]/, 'delimiter.bracket'],
        [/".*?"/, 'string'],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, 'comment']
      ],
      sequenceDiagram: [
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              '@sequenceDiagramBlockKeywords': 'typeKeyword',
              '@sequenceDiagramKeywords': 'keyword',
              '@default': 'variable'
            }
          }
        ],
        [/(--?>?>|--?[)x])[+-]?/, 'transition'],
        [/(:)([^:\n]*?$)/, ['delimiter.bracket', 'string']],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, 'comment']
      ],
      classDiagram: [
        [
          /(\*|<\|?|o|)(--|\.\.)(\*|\|?>|o|)([ \t]*[a-zA-Z]+[ \t]*)(:)(.*?$)/,
          [
            'transition',
            'transition',
            'transition',
            'variable',
            'delimiter.bracket',
            'string'
          ]
        ],
        [/(?!class\s)([a-zA-Z]+)(\s+[a-zA-Z]+)/, ['type', 'variable']],
        [/(\*|<\|?|o)?(--|\.\.)(\*|\|?>|o)?/, 'transition'],
        [/^\s*class\s(?!.*\{)/, 'keyword'],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              '@classDiagramBlockKeywords': 'typeKeyword',
              '@classDiagramKeywords': 'keyword',
              '@default': 'variable'
            }
          }
        ],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, 'comment'],
        [
          /(<<)(.+?)(>>)/,
          ['delimiter.bracket', 'annotation', 'delimiter.bracket']
        ],
        [/".*?"/, 'string'],
        [/:::/, 'transition'],
        [/:|\+|-|#|~|\*\s*$|\$\s*$|\(|\)|{|}/, 'delimiter.bracket']
      ],
      journey: [
        [/(title)(.*)/, ['keyword', 'string']],
        [/(section)(.*)/, ['typeKeyword', 'string']],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              '@journeyBlockKeywords': 'typeKeyword',
              '@journeyKeywords': 'keyword',
              '@default': 'variable'
            }
          }
        ],
        [
          /(^\s*.+?)(:)(.*?)(:)(.*?)([,$])/,
          [
            'string',
            'delimiter.bracket',
            'number',
            'delimiter.bracket',
            'variable',
            'delimiter.bracket'
          ]
        ],
        [/,/, 'delimiter.bracket'],
        [/(^\s*.+?)(:)([^:]*?)$/, ['string', 'delimiter.bracket', 'variable']],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, 'comment']
      ],
      gantt: [
        [/(title)(.*)/, ['keyword', 'string']],
        [/(section)(.*)/, ['typeKeyword', 'string']],
        [/^\s*([^:\n]*?)(:)/, ['string', 'delimiter.bracket']],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              '@ganttBlockKeywords': 'typeKeyword',
              '@ganttKeywords': 'keyword'
            }
          }
        ],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, 'comment'],
        [/:/, 'delimiter.bracket']
      ],
      stateDiagram: [
        [/note[^:]*$/, { token: 'typeKeyword', next: 'stateDiagramNote' }],
        ['hide empty description', 'keyword'],
        [/^\s*state\s(?!.*\{)/, 'keyword'],
        [/(<<)(fork|join|choice)(>>)/, 'annotation'],
        [
          /(\[\[)(fork|join|choice)(]])/,
          ['delimiter.bracket', 'annotation', 'delimiter.bracket']
        ],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              '@stateDiagramBlockKeywords': 'typeKeyword',
              '@stateDiagramKeywords': 'keyword',
              '@default': 'variable'
            }
          }
        ],
        [/".*?"/, 'string'],
        [/(:)([^:\n]*?$)/, ['delimiter.bracket', 'string']],
        [/{|}/, 'delimiter.bracket'],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, 'comment'],
        [/-->/, 'transition'],
        [/\[.*?]/, 'string']
      ],
      stateDiagramNote: [
        [/^\s*end note$/, { token: 'typeKeyword', next: '@pop' }],
        [/.*/, 'string']
      ],
      erDiagram: [
        [/[}|][o|](--|\.\.)[o|][{|]/, 'transition'],
        [/".*?"/, 'string'],
        [/(:)(.*?$)/, ['delimiter.bracket', 'string']],
        [/:|{|}/, 'delimiter.bracket'],
        [/([a-zA-Z]+)(\s+[a-zA-Z]+)/, ['type', 'variable']],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, 'comment'],
        [/[a-zA-Z_-][\w$]*/, 'variable']
      ],
      requirementDiagram: [
        [/->|<-|-/, 'transition'],
        [/(\d+\.)*\d+/, 'number'],
        [
          /[a-zA-Z_-][\w$]*/,
          {
            cases: {
              '@requirementDiagramBlockKeywords': 'typeKeyword',
              '@default': 'variable'
            }
          }
        ],
        [/:|{|}|\//, 'delimiter.bracket'],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, 'comment'],
        [/".*?"/, 'string']
      ]
    }
  }))
}
