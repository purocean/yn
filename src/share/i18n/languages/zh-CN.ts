/* eslint-disable quote-props */
import type { BaseLanguage } from './en'

const data: BaseLanguage = {
  'app-name': 'Yank Note',
  'slogan': '一款面向程序员的 Markdown 编辑器',
  'cancel': '取消',
  'ok': '确定',
  'demo-tips': 'DEMO 模式下一些功能不可用',
  'blank-page': '空白页',
  'copied': '已复制',
  'insert-different-repo-doc': '不能插入不同仓库的文档',
  'need-clipboard-permission': '请授予剪切板权限',
  'click-to-copy': '单击复制',
  'click-to-copy-link': '单击复制链接',
  'copy-code': '复制代码',
  'loading': '加载中',
  'add-image': '添加图片',
  'upload-image': '上传图片',
  'exit-presentation-msg': '按下 Esc 键退出演示模式',
  'reload': '重载',
  'open-in-new-window': '新窗口打开',
  'view-figure': '查看图形',
  'export': '导出',
  'no-password': '未输入密码',
  'save': '保存',
  'close': '关闭',
  'edit': '编辑',
  'discard': '放弃',
  'premium': {
    'need-purchase': '[%s] 需要高级版',
    'buy-license': '立即购买',
    'free': '免费版',
    'premium': '高级版',
    'intro': {
      'intro': '介绍',
      'current-plan': '当前版本',
      'included': '已包含',
      'desc': 'Yank Note 是一款面向程序员的开源笔记应用，从 2018 年开始，一直在不断更新。 因为软件的开发和维护需要精力和资金（如每年的苹果开发者账号订阅），现推出付费高级版。如果您需要高级版功能，或想支持我的开发，可以选择购买高级版。',
      'free-desc': '满足大部分用户需求',
      'premium-desc': '更多高级功能',
      'free-list': '基础编辑功能\n图形嵌入\n运行代码片段\nHTML 小工具\n文档加密\n内置终端\n文档历史',
      'premium-list': '基础编辑功能\n图形嵌入\n运行代码片段\nHTML 小工具\n文档加密\n内置终端\n文档历史 (增强)\n宏替换\n暗色主题',
    },
    'buy': {
      'buy': '购买',
      'step-1': '1. 付款，请备注“%s”',
      'step-2': '2. 发送邮件给我，获取激活码',
      'step-3': '3. 输入激活码，激活高级版功能',
      'send-email': '发送邮件',
      'email-tips': '将在 12 小时内处理',
      'email-failed': '发送失败？',
      'email-failed-dialog': {
        'title': '手动发送邮件',
        'content': '发送如下内容到 yank-note@outlook.com 索取激活码',
      },
      'wechat': '微信',
      'alipay': '支付宝',
      'email': {
        'subject': '获取 Yank Note 高级版激活码',
        'body': '随机码：%s\n产品：%s\n名字: <请填写，将展示在激活信息中>\n邮箱: <请填写，将展示在激活信息中>\n\n-------------------------\n\n<其他留言，付款凭证等>',
      },
    },
    'activation': {
      'license': '激活',
      'activation': '输入激活码',
      'placeholder': '请输入激活码',
      'info': '已激活',
      'name': '姓名: %s',
      'email': '邮箱: %s',
      'expires': '有效期至: %s',
      'hash': '指纹: %s',
      'success': '激活成功',
      'activating': '激活中',
      'tips': '如果您在激活过程中遇到问题，请联系我',
      'tips-email': '邮箱',
      'tips-wechat': '微信',
    },
  },
  'app': {
    'quit': '退出',
    'preferences': '偏好设置',
    'close-window': '关闭窗口',
    'toggle-fullscreen': '切换全屏',
    'tray': {
      'open-main-window': '打开主界面',
      'open-in-browser': '浏览器中打开',
      'open-main-dir': '打开主目录',
      'preferences': '偏好设置',
      'start-at-login': '开机启动',
      'version': '版本 %s',
      'quit': '退出',
      'dev': {
        'dev': '开发',
        'port-prod': '正式端口 (%s)',
        'port-dev': '开发端口 (%s)',
        'reload': '重载页面',
        'dev-tool': '主窗口开发工具',
        'restart': '重新启动',
        'force-quit': '强制退出',
      }
    },
    'updater': {
      'found-dialog': {
        'title': 'Yank Note - 发现新版本',
        'desc': '当前版本: %s\n新版本: %s',
        'buttons': {
          'download': '下载',
          'view-changes': '查看更新内容',
          'cancel': '取消',
          'ignore': '忽略'
        }
      },
      'progress-bar': {
        'title': 'Yank Note - 下载',
        'detail': '下载中 %s',
        'failed': '下载失败: %s'
      },
      'failed-dialog': {
        'title': 'Yank Note - 出现了一些错误',
      },
      'install-dialog': {
        'title': 'Yank Note - 下载完成',
        'desc': '新版本下载完成，是否要立即安装？',
        'buttons': {
          'install': '安装',
          'delay': '推迟',
        }
      },
      'no-newer-dialog': {
        'title': 'Yank Note - 无新版本',
        'desc': '当前已是最新版本'
      }
    },
  },
  'quit-check-dialog': {
    'title': '提示',
    'desc': '有文档未保存，是否要退出？',
    'buttons': {
      'cancel': '取消',
      'discard': '放弃保存并退出',
    },
  },
  'save-check-dialog': {
    'title': '提示',
    'desc': '文档尚未保存，是否要保存？',
  },
  'file-status': {
    'unsaved': '未保存',
    'saving': '保存中',
    'saved': '已保存',
    'save-failed': '保存失败！',
    'loaded': '加载完毕',
    'loading': '加载中…',
    'no-file': '未打开文件'
  },
  'modal': {
    'info': '提示',
    'input-placeholder': '请输入...',
  },
  'document': {
    'current-path': '当前路径: %s',
    'password-create': '[创建] 请输入密码',
    'password-save': '[保存] 请输入密码',
    'password-open': '[打开] 请输入密码',
    'wrong-password': '密码错误',
    'file-transform-error': '加密文件和非加密文件不能互相转换',
    'create-dialog': {
      'title': '创建文件（加密文件以 .c.md 结尾）',
      'hint': '文件名',
    },
    'create-dir-dialog': {
      'title': '创建文件夹',
      'hint': '文件夹名',
    },
    'duplicate-dialog': {
      'title': '重复文件',
      'hint': '目标路径',
    },
    'delete-dialog': {
      'title': '删除文件',
      'content': '确定要删除 [%s] 吗？'
    },
    'move-dialog': {
      'title': '移动文件',
      'content': '新的路径'
    },
    'save-encrypted-file-dialog': {
      'title': '提示',
      'content': '密码和上一次输入的密码不一致，是否用新密码保存？',
    },
  },
  'status-bar': {
    'view': {
      'view': '视图',
      'xterm': '显示终端',
      'preview': '显示预览',
      'editor': '显示编辑',
      'side-bar': '显示侧栏',
      'word-wrap': '文本换行',
      'typewriter-mode': '打字机模式',
      'zoom-in': '放大',
      'zoom-out': '缩小',
      'zoom-reset': '实际大小',
    },
    'setting': '设置',
    'repo': {
      'repo': '仓库: %s',
      'no-data': '未选择仓库',
    },
    'nav': {
      'nav': '导航',
      'goto': '快速跳转',
      'forward': '前进',
      'back': '后退',
    },
    'insert': {
      'insert': '插入',
      'paste-rt': '粘贴富文本',
      'paste-img-base64': '粘贴图片',
    },
    'tool': {
      'tool': '工具',
      'convert-img-link': '下载外链图片',
      'macro-copy-markdown': '复制宏替换后的 Markdown',
      'copy-content': '复制内容',
      'doc-history': '文档历史版本',
      'share-preview': '分享预览',
    },
    'document-info': {
      'selected': '已选择',
      'lines': '总行数',
      'chars': '字符数',
    },
    'help': {
      'help': '帮助',
      'readme': '应用介绍',
      'features': '特色功能说明',
      'shortcuts': '快捷键',
      'plugin': '插件开发'
    },
    'terminal': '终端',
    'present': '预览',
    'get': {
      'get-application': '获取应用',
    },
  },
  'view': {
    'outline': '目录',
    'print': '打印',
  },
  'tree': {
    'db-click-refresh': '双击刷新目录树',
    'add-repo': '添加仓库',
    'add-repo-hint': '选择一个位置保存笔记',
    'created-at': '创建于: %s',
    'updated-at': '更新于: %s',
    'context-menu': {
      'mark': '标记文件',
      'unmark': '取消标记',
      'duplicate': '重复文件',
      'create-doc': '创建文件',
      'create-dir': '创建文件夹',
      'rename': '重命名 / 移动',
      'delete': '删除',
      'open-in-os': '在系统中打开',
      'reveal-in-os': '在系统中显示',
      'refresh': '刷新目录',
      'open-in-terminal': '在终端中打开',
      'create-in-cd': '当前目录创建新文件',
      'copy-name': '复制名称',
      'copy-path': '复制路径',
    }
  },
  'tabs': {
    'close-others': '关闭其他',
    'close-right': '关闭到右侧',
    'close-left': '关闭到左侧',
    'close-all': '全部关闭',
    'pin': '固定',
    'unpin': '取消固定',
  },
  'export-panel': {
    'export': '导出',
    'format': '格式',
    'pdf': {
      'orientation': '方向',
      'portrait': '纵向',
      'landscape': '横向',
      'size': '尺寸',
      'zoom': '缩放',
      'use-browser': '将使用浏览器打印功能',
      'include-bg': '包含背景',
    },
    'use-html': '使用渲染后的 HTML 转换',
    'use-markdown': '使用 Markdown 转换',
    'loading': '转换中，请稍候……',
  },
  'title-bar': {
    'pin': '置顶窗口',
    'minimize': '最小化',
    'unmaximize': '还原',
    'maximize': '最大化',
  },
  'setting-panel': {
    'setting': '设置',
    'add': '添加%s',
    'delete-warning': '确定要删除吗？',
    'error-choose-repo-path': '请选择储存位置',
    'keep-running-after-closing-window': '关闭窗口后保持运行',
    'schema': {
      'repos': {
        'repos': '仓库',
        'repo': '仓库',
        'name': '仓库名',
        'name-placeholder': '请输入',
        'path': '路径',
        'path-placeholder': '请选择一个路径'
      },
      'editor': {
        'mouse-wheel-zoom': '鼠标滚动缩放',
        'font-size': '字体大小',
        'tab-size': 'Tab 宽度',
        'ordered-list-completion': '有序列表补全',
      },
      'theme': '主题',
      'language': '语言',
      'custom-css': '自定义 CSS',
      'assets-dir': '图片存放目录',
      'assets-desc': '支持相对路径和绝对路径（限于仓库内部）,可用变量：docSlug, docName, date',
      'shell': 'Shell',
      'auto-save': '自动保存',
      'plantuml-api': 'Plantuml 端点',
      'updater': {
        'source': '更新源',
      },
      'doc-history': {
        'number-limit': '版本保留数',
      },
      'server': {
        'host': '监听主机',
        'port': '监听端口',
        'port-desc': '需要重启应用',
      },
    },
    'tabs': {
      'repos': '仓库',
      'appearance': '外观',
      'editor': '编辑器',
      'image': '图片',
      'other': '其他',
    },
  },
  'quick-open': {
    'input-placeholder': '键入字符……',
    'empty': '无结果',
    'files': '快速跳转',
    'search': '搜索内容',
    'marked': '已标记',
  },
  'editor': {
    'context-menu': {
      'paste-image': '粘贴图片',
      'paste-image-as-base64': '粘贴图片为 Base64',
      'paste-rt-as-markdown': '粘贴富文本为 Markdown',
      'add-attachment': '添加附件',
      'link-doc': '链接文档',
      'link-file': '链接文件',
      'insert-date': '插入当前日期',
      'insert-time': '插入当前时间',
    }
  },
  'picgo': {
    'setting': {
      'api-title': 'PicGo 接口',
      'api-desc': 'PicGo 默认接口地址：http://127.0.0.1:36677/upload',
      'api-msg': '必须以 http:// 开头',
      'paste-title': '粘贴图片使用 PicGo 图床'
    },
    'uploading': '上传中……',
    'upload-failed': '上传失败',
    'need-api': '请先配置 PicGo 图床接口地址',
  },
  'code-run': {
    'run': '运行',
    'run-in-xterm-tips': '在终端中运行代码，%s + 单击不退出解释器',
    'run-in-xterm': '终端中运行',
    'running': '运行中……',
    'clear': '清空',
  },
  'drawio': {
    'edit-diagram': '编辑图形 - %s',
    'fit-height': '适应高度',
    'create-drawio-file': '创建 Drawio 文件 %s',
  },
  'mind-map': {
    'zoom-in': '放大',
    'zoom-out': '缩小',
    'fit-height': '适应高度',
    'switch-layout': '切换布局',
    'switch-loose': '紧凑/宽松',
    'convert-error': '转换错误\n    1. 请保证大纲只有一个根项目\n    2. 请保证大纲层级正确',
  },
  'table-cell-edit': {
    'esc-to-cancel': 'ESC 取消',
    'db-click-edit': '双击编辑',
    'canceled': '已取消编辑',
    'edit-hint': '单元格内容',
    'edit-title': '编辑单元格',
    'edit-error': '编辑出错',
    'limit-single-line': '只支持编辑单行文本',
    'context-menu': {
      'edit': '编辑',
      'quick-edit': '快速编辑',
      'sort-mode': '排序模式',
      'sort-asc': '升序',
      'sort-desc': '降序',
      'align-left': '左对齐',
      'align-center': '居中',
      'align-right': '右对齐',
      'align-normal': '取消对齐',
      'add-row-above': '在上面添加行',
      'add-row-below': '在下面添加行',
      'delete-row': '删除行',
      'add-col-left': '在左侧添加列',
      'add-col-right': '在右侧添加列',
      'delete-col': '删除列',
    },
  },
  'lucky-sheet': {
    'saved-at': '保存于',
    'edit-sheet': '编辑表格',
    'create-dialog-title': '创建 Luckysheet 文件',
  },
  'markdown-link': {
    'convert-to-titled-link': '转换为带标题的链接',
  },
  'custom-css': {
    'change-confirm': {
      'title': '提示',
      'content': '更改自定义 CSS 需要重载页面，是否继续？',
    }
  },
  'control-center': {
    'control-center': '控制中心 (%s)',
    'switch': {
      'side-bar': '侧栏 %s',
      'editor': '编辑器 %s',
      'view': '预览 %s',
      'sync-scroll': '同步滚动',
      'sync-rendering': '同步渲染',
      'word-wrap': '编辑器换行 %s',
      'typewriter-mode': '打字机模式',
    },
    'navigation': {
      'goto': '跳转 %s',
      'forward': '前进 %s',
      'back': '后退 %s',
      'refresh': '刷新 %s',
    }
  },
  'doc-history': {
    'apply-version': '应用选中版本',
    'no-history': '无历史版本',
    'content': '内容',
    'diff': '对比',
    'history': '历史',
    'current': '当前',
    'all': '全部',
    'marked': '已标记',
    'mark': '标记',
    'unmark': '取消标记',
    'delete': '删除',
    'edit-message': '编辑消息',
    'delete-dialog': {
      'title': '删除版本',
      'content': '你确定要删除版本 [%s] 吗？',
    },
    'clear-dialog': {
      'title': '清除版本',
      'content': '你确定要清除未标记的版本吗？',
    },
    'mark-dialog': {
      'title': '标记版本 [%s]',
      'hint': '输入一些信息（可选）',
    },
  },
  'copy-content': {
    'options': '选项: ',
    'type': '复制类型: ',
    'inline-style': '内联样式',
    'inline-image': '内联本地图片',
    'upload-image': '上传本地图片',
    'highlight-code': '高亮代码',
    'rt': '富文本',
    'complete': '转换完成，点击确定复制',
  },
  'share-preview': {
    'expire': '到期',
    'tips': '请先在设置中配置监听主机 “0.0.0.0”',
  },
}

export default data
