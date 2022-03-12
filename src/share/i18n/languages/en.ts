/* eslint-disable quote-props */

const data = {
  'app-name': 'Yank Note',
  'slogan': 'A Hackable Markdown editor for developers',
  'cancel': 'Cancel',
  'ok': 'OK',
  'demo-tips': 'Some features are not available in DEMO mode.',
  'blank-page': 'Blank',
  'copied': 'Copied',
  'insert-different-repo-doc': 'Documents from different repository cannot be inserted',
  'need-clipboard-permission': 'Please grant clipboard permissions',
  'click-to-copy': 'Click to copy',
  'click-to-copy-link': 'Click to copy link',
  'copy-code': 'Copy code',
  'loading': 'Loading',
  'add-image': 'Add Image',
  'upload-image': 'Upload Image',
  'exit-presentation-msg': 'Press the Esc key to exit',
  'reload': 'Reload',
  'open-in-new-window': 'New Window',
  'view-figure': 'View Figure',
  'export': 'Export',
  'no-password': 'No password was entered',
  'save': 'Save',
  'close': 'Close',
  'discard': 'Discard',
  'edit': 'Edit',
  'premium': {
    'need-purchase': '[%s] Premium is required',
    'buy-license': 'Buy License',
    'free': 'Free',
    'premium': 'Premium',
    'intro': {
      'intro': 'Intro',
      'current-plan': 'Current Plan',
      'included': 'Included',
      'desc': 'Yank Note is open-source, I\'ve been constantly updating it since 2018. It consumes my energy and money (such as the annual Apple developer account subscription). Now a paid premium version is available. If you need advanced features or want to support my development, you can buy a license.',
      'free-desc': 'For most users',
      'premium-desc': 'More features',
      'free-list': 'Basic Editing\nGraphic Embedding\nRun Code Snippet\nHTML Applets\nEncryption\nIntegrated Terminal\nDocument History',
      'premium-list': 'Basic Editing\nGraphic Embedding\nRun Code Snippet\nHTML Applets\nEncryption\nIntegrated Terminal\nDocument History(Advanced)\nMacro Replacement\nDark Mode',
    },
    'buy': {
      'buy': 'Buy',
      'step-1': '1. Pay and note "%s"',
      'step-2': '2. Send an email to me to get the license',
      'step-3': '3. Enter the license to activate the advanced features',
      'send-email': 'Send Email',
      'email-tips': 'Will be processed within 12 hours',
      'email-failed': 'Failed?',
      'email-failed-dialog': {
        'title': 'Send Mail Manually',
        'content': 'Please send the following content to "yank-note@outlook.com" to request license.',
      },
      'wechat': 'Wechat',
      'alipay': 'Alipay',
      'email': {
        'subject': 'Get Yank Note Premium License',
        'body': 'Code: %s\nProduct: %s\nName: <will appear on the license key>\nEmail: <will appear on the license key>\n\n-------------------------\n\n<other message>',
      },
    },
    'activation': {
      'license': 'License',
      'activation': 'Enter License',
      'placeholder': 'Enter license',
      'info': 'Activated',
      'name': 'Name: %s',
      'email': 'Email: %s',
      'expires': 'Expired at: %s',
      'hash': 'Hash: %s',
      'success': 'Success',
      'activating': 'Activating',
      'tips': 'If you have trouble, please contact me',
      'tips-email': 'Email',
      'tips-wechat': 'Wechat',
    },
  },
  'app': {
    'quit': 'Quit',
    'preferences': 'Preferences',
    'close-window': 'Close Window',
    'toggle-fullscreen': 'Toggle Full Screen',
    'tray': {
      'open-main-window': 'Open Main Window',
      'open-in-browser': 'Open in Browser',
      'open-main-dir': 'Open Main Dir',
      'preferences': 'Preferences',
      'start-at-login': 'Start at Login',
      'version': 'Version %s',
      'quit': 'Quit',
      'dev': {
        'dev': 'Develop',
        'port-prod': 'Prod Port (%s)',
        'port-dev': 'Dev port (%s)',
        'reload': 'Reload',
        'dev-tool': 'Develop Tool',
        'restart': 'Restart',
        'force-quit': 'Force Quit',
      }
    },
    'updater': {
      'found-dialog': {
        'title': 'Yank Note - Newer version was found',
        'desc': 'Current version: %s\nNewer version: %s',
        'buttons': {
          'download': 'Download',
          'view-changes': 'View Changes',
          'cancel': 'Cancel',
          'ignore': 'Don\'t Ask Again'
        }
      },
      'progress-bar': {
        'title': 'Yank Note - Download',
        'detail': 'Downloading %s',
        'failed': 'Download failed: %s'
      },
      'failed-dialog': {
        'title': 'Yank Note - Something went wrong',
      },
      'install-dialog': {
        'title': 'Yank Note - Download complete',
        'desc': 'Do you want to install it now?',
        'buttons': {
          'install': 'Install',
          'delay': 'Delay',
        }
      },
      'no-newer-dialog': {
        'title': 'Yank Note - No newer version',
        'desc': 'The current version is up-to-date'
      }
    },
  },
  'quit-check-dialog': {
    'title': 'Attention',
    'desc': 'The document has unsaved changes. Do you really want to quit without saving?',
    'buttons': {
      'cancel': 'Cancel',
      'discard': 'Discard Changes and exit',
    },
  },
  'save-check-dialog': {
    'title': 'Attention',
    'desc': 'The document has not been saved, do you want to save it?',
  },
  'file-status': {
    'unsaved': 'Unsaved',
    'saving': 'Saving',
    'saved': 'Saved',
    'save-failed': 'Save Failed!',
    'loaded': 'Loaded',
    'loading': 'Loading',
    'no-file': 'No open file'
  },
  'modal': {
    'info': 'Info',
    'input-placeholder': 'Please input...',
  },
  'document': {
    'current-path': 'Current Path: %s',
    'password-create': '[Create] Please enter a password',
    'password-save': '[Save] Please enter password of the file',
    'password-open': '[Open] Please enter password of the file',
    'wrong-password': 'Wrong Password',
    'file-transform-error': 'Encrypted and unencrypted files cannot be converted to each other',
    'create-dialog': {
      'title': 'Create a file (encrypted file ends with .c.md)',
      'hint': 'File name',
    },
    'create-dir-dialog': {
      'title': 'Create a Folder',
      'hint': 'Folder name',
    },
    'duplicate-dialog': {
      'title': 'Duplicate a File',
      'hint': 'Target path',
    },
    'delete-dialog': {
      'title': 'Delete a File',
      'content': 'Are you sure want to delete %s?'
    },
    'move-dialog': {
      'title': 'Move/Rename a File',
      'content': 'New path'
    },
    'save-encrypted-file-dialog': {
      'title': 'Attention',
      'content': 'The password doesn\'t match the old password, save it with the new password?',
    },
  },
  'status-bar': {
    'view': {
      'view': 'View',
      'xterm': 'Show Terminal',
      'preview': 'Show Preview',
      'editor': 'Show Editor',
      'side-bar': 'Show Side Bar',
      'word-wrap': 'Word Wrap',
      'typewriter-mode': 'Typewriter Mode',
      'zoom-in': 'Zoom In',
      'zoom-out': 'Zoom Out',
      'zoom-reset': 'Actual Size',
    },
    'setting': 'Setting',
    'repo': {
      'repo': 'Repo: %s',
      'no-data': 'No Repo',
    },
    'nav': {
      'nav': 'Navigation',
      'goto': 'Goto',
      'forward': 'Forward',
      'back': 'Back',
    },
    'insert': {
      'insert': 'Insert',
      'paste-rt': 'Paste Rich Text',
      'paste-img-base64': 'Paste Image',
    },
    'tool': {
      'tool': 'Tool',
      'convert-img-link': 'Download Remote Image',
      'macro-copy-markdown': 'Copy Markdown after Macro Replacement',
      'copy-content': 'Copy Content',
      'doc-history': 'Document History',
      'share-preview': 'Share Preview',
    },
    'document-info': {
      'selected': 'Selected',
      'lines': 'Lines',
      'chars': 'Chars',
    },
    'help': {
      'help': 'Help',
      'readme': 'Introduction',
      'features': 'Features',
      'shortcuts': 'Shortcuts',
      'plugin': 'Create Plugin'
    },
    'terminal': 'Terminal',
    'present': 'Present',
    'get': {
      'get-application': 'Get Application',
    }
  },
  'view': {
    'outline': 'Outline',
    'print': 'Print',
  },
  'tree': {
    'db-click-refresh': 'Double click to refresh',
    'add-repo': 'Add repository',
    'add-repo-hint': 'Choose a location to save your notes',
    'created-at': 'Created at: %s',
    'updated-at': 'Updated at: %s',
    'context-menu': {
      'mark': 'Mark File',
      'unmark': 'Unmark File',
      'duplicate': 'Duplicate',
      'create-doc': 'New File',
      'create-dir': 'New Folder',
      'rename': 'Rename / Move',
      'delete': 'Delete',
      'open-in-os': 'Open in OS',
      'reveal-in-os': 'Reveal in OS',
      'refresh': 'Refresh',
      'open-in-terminal': 'Open in Terminal',
      'create-in-cd': 'New File',
      'copy-name': 'Copy Name',
      'copy-path': 'Copy Path',
    }
  },
  'tabs': {
    'close-others': 'Close Others',
    'close-right': 'Close to the Right',
    'close-left': 'Close to the Left',
    'close-all': 'Close All',
    'pin': 'Pin',
    'unpin': 'Unpin',
  },
  'export-panel': {
    'export': 'Export',
    'format': 'Format',
    'pdf': {
      'orientation': 'Orientation',
      'portrait': 'Portrait',
      'landscape': 'Landscape',
      'size': 'Size',
      'zoom': 'Zoom',
      'use-browser': 'The browser printing feature will be used.',
      'include-bg': 'Include background',
    },
    'use-html': 'Use the rendered HTML source',
    'use-markdown': 'Use markdown source',
    'loading': 'Converting, please wait...',
  },
  'title-bar': {
    'pin': 'Pin',
    'minimize': 'Minimize',
    'unmaximize': 'Unmaximize',
    'maximize': 'Maximize',
  },
  'setting-panel': {
    'setting': 'Setting',
    'add': 'Add %s',
    'delete-warning': 'Are you sure you want to remove this node?',
    'error-choose-repo-path': 'Please choose repository path',
    'keep-running-after-closing-window': 'Keep Running after Closing Window',
    'tabs': {
      'repos': 'Repositories',
      'appearance': 'Appearance',
      'editor': 'Editor',
      'image': 'Image',
      'other': 'Other',
    },
    'schema': {
      'repos': {
        'repos': 'Repositories',
        'repo': 'Repository',
        'name': 'Name',
        'name-placeholder': 'Name',
        'path': 'Path',
        'path-placeholder': 'Please select the storage location'
      },
      'editor': {
        'mouse-wheel-zoom': 'Mouse Wheel Zoom',
        'font-size': 'Font Size',
        'tab-size': 'Tab Size',
        'ordered-list-completion': 'Ordered List',
      },
      'theme': 'Theme',
      'language': 'Language',
      'custom-css': 'Custom CSS',
      'assets-dir': 'Image Dir',
      'assets-desc': 'Relative or absolute path (in document repository). Variables: docSlug, docName, date.',
      'shell': 'Shell',
      'auto-save': 'Auto Save',
      'plantuml-api': 'Plantuml Endpoint',
      'updater': {
        'source': 'Update Source',
      },
      'doc-history': {
        'number-limit': 'Versions Retained',
      },
      'server': {
        'host': 'Listen Host',
        'port': 'Listen Port',
        'port-desc': 'Need to restart the application.'
      },
    }
  },
  'quick-open': {
    'input-placeholder': 'Type characters...',
    'empty': 'Empty',
    'files': 'Files',
    'search': 'Search',
    'marked': 'Marked',
  },
  'editor': {
    'context-menu': {
      'paste-image': 'Paste Image',
      'paste-image-as-base64': 'Paste Image as Base64',
      'paste-rt-as-markdown': 'Paste Rich Text as Markdown',
      'add-attachment': 'Add Attachment',
      'link-doc': 'Link Document',
      'link-file': 'Link File',
      'insert-date': 'Insert Today\'s Date',
      'insert-time': 'Insert Current Time',
    }
  },
  'picgo': {
    'setting': {
      'api-title': 'PicGo Api',
      'api-desc': 'PicGo default URL: http://127.0.0.1:36677/upload',
      'api-msg': 'Must starts with http://',
      'paste-title': 'Paste image with PicGo'
    },
    'uploading': 'Uploading',
    'upload-failed': 'Upload Failed',
    'need-api': 'Please configure PicGo Api first.'
  },
  'code-run': {
    'run': 'Run',
    'run-in-xterm-tips': 'Run code in terminal, %s + click do not exit',
    'run-in-xterm': 'Run in terminal',
    'running': 'Running...',
    'clear': 'Clear',
  },
  'drawio': {
    'edit-diagram': 'Edit Diagram - %s',
    'fit-height': 'Fit Height',
    'create-drawio-file': 'Create Drawio File %s',
  },
  'mind-map': {
    'zoom-in': 'Zoom In',
    'zoom-out': 'Zoom Out',
    'fit-height': 'Fit',
    'switch-layout': 'Layout',
    'switch-loose': 'Compact/Loose',
    'convert-error': 'Conversion error\n    1. Please ensure that the outline has only one root item.\n    2. Please ensure that the outline level is correct.',
  },
  'table-cell-edit': {
    'esc-to-cancel': 'Press ESC to cancel',
    'db-click-edit': 'Double Click to Edit',
    'canceled': 'Canceled',
    'edit-hint': 'Content',
    'edit-title': 'Edit Cell',
    'edit-error': 'Something wrong',
    'limit-single-line': 'Editing only single lines',
    'context-menu': {
      'edit': 'Edit',
      'quick-edit': 'Quit Edit',
      'sort-mode': 'Sort Mode',
      'sort-asc': 'Sort ascending',
      'sort-desc': 'Sort descending',
      'align-left': 'Align Left',
      'align-center': 'Align Center',
      'align-right': 'Align Right',
      'align-normal': 'Align Normal',
      'add-row-above': 'Add Row Above',
      'add-row-below': 'Add Row Below',
      'delete-row': 'Delete Row',
      'add-col-left': 'Add Column Left',
      'add-col-right': 'Add Column Right',
      'delete-col': 'Delete Column',
    },
  },
  'lucky-sheet': {
    'saved-at': 'Saved at',
    'edit-sheet': 'Edit Sheet',
    'create-dialog-title': 'Create Luckysheet File',
  },
  'markdown-link': {
    'convert-to-titled-link': 'Convert to Titled Link',
  },
  'custom-css': {
    'change-confirm': {
      'title': 'Attention',
      'content': 'Changing the custom CSS requires the page to be reloaded. Do you want to continue?',
    }
  },
  'control-center': {
    'control-center': 'Control Center (%s)',
    'switch': {
      'side-bar': 'Side Bar %s',
      'editor': 'Editor %s',
      'view': 'Editor %s',
      'sync-scroll': 'Synchronous Scrolling',
      'sync-rendering': 'Synchronous Rendering',
      'word-wrap': 'Word Wrap %s',
      'typewriter-mode': 'Typewriter Mode',
    },
    'navigation': {
      'goto': 'Goto %s',
      'forward': 'Forward %s',
      'back': 'Back %s',
      'refresh': 'Refresh %s',
    }
  },
  'doc-history': {
    'apply-version': 'Apply Selected Version',
    'no-history': 'No History',
    'content': 'Content',
    'diff': 'Diff',
    'history': 'History',
    'current': 'Current',
    'all': 'All',
    'marked': 'Marked',
    'mark': 'Mark',
    'unmark': 'Unmark',
    'delete': 'Delete',
    'edit-message': 'Edit Message',
    'delete-dialog': {
      'title': 'Delete',
      'content': 'Are you sure want to delete [%s]?',
    },
    'clear-dialog': {
      'title': 'Clear',
      'content': 'Are you sure want to clear unmarked versions?',
    },
    'mark-dialog': {
      'title': 'Mark Version [%s]',
      'hint': 'Input some message (optional)',
    },
  },
  'copy-content': {
    'options': 'Options: ',
    'type': 'Copy Type: ',
    'inline-style': 'Inline Style',
    'inline-image': 'Inline Local Image',
    'upload-image': 'Upload Local Image',
    'highlight-code': 'Highlight Code',
    'rt': 'Rich Text',
    'complete': 'Conversion completed, click OK to copy',
  },
  'share-preview': {
    'expire': 'Expire',
    'tips': 'Please configure the listening host "0.0.0.0" in the settings first',
  },
}

export type BaseLanguage = typeof data

export default data
