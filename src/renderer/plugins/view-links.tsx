import { ROOT_REPO_NAME_PREFIX } from '@share/misc'
import IndexStatus from '@fe/components/IndexStatus.vue'
import GroupTabs from '@fe/components/GroupTabs.vue'
import SvgIcon from '@fe/components/SvgIcon.vue'
import type { Plugin } from '@fe/context'
import type { Doc, PositionState } from '@fe/types'

export default {
  name: 'view-links',
  register: (ctx) => {
    const actionName = 'plugin.view-links.view-document-links'

    const ViewLinksComponent = ctx.lib.vue.defineComponent(() => {
      type TabItemValue = 'links' | 'back-links'
      type ListItem = {doc: Doc, position?: PositionState | null}

      const currentTab = ctx.lib.vue.ref<TabItemValue>('links')
      const title = ctx.lib.vue.ref('')
      const list = ctx.lib.vue.ref<(ListItem[] | null)>(null)
      const { $t } = ctx.i18n.useI18n()

      const currentFileRepo = ctx.store.state.currentFile?.repo
      const currentFilePath = ctx.store.state.currentFile?.path
      const currentFileName = ctx.store.state.currentFile?.name

      const buildList = (type: TabItemValue) => {
        list.value = null
        title.value = currentFileName ? {
          links: $t.value('view-links.links-in', currentFileName),
          'back-links': $t.value('view-links.back-links-for', currentFileName),
        }[type] : ''

        if (!ctx.store.state.currentRepoIndexStatus?.status.ready || currentFileRepo !== ctx.store.state.currentRepoIndexStatus?.repo || !currentFilePath) {
          list.value = []
          return
        }

        const dm = ctx.indexer.getDocumentsManager()

        if (type === 'links') {
          dm.findByRepoAndPath(currentFileRepo, currentFilePath).then(doc => {
            if (currentTab.value === 'links') {
              list.value = doc ? doc.links.filter(link => !!link.internal).map(link => ({
                doc: { type: 'file', repo: currentFileRepo, path: link.internal!, name: ctx.utils.path.basename(link.internal!) },
                position: link.position
              })) : []
            }
          })
        } else if (type === 'back-links') {
          const data: ListItem[] = []

          dm.getTable().where({ repo: currentFileRepo }).each(doc => {
            doc.links.forEach(link => {
              if (link.internal === currentFilePath) {
                const position: PositionState = { line: link.blockMap[0] + 1 }
                data.push({ doc: { type: 'file', repo: currentFileRepo, path: doc.path, name: ctx.utils.path.basename(doc.path) }, position })
              }
            })
          }).then(() => {
            if (currentTab.value === 'back-links') {
              list.value = data
            }
          })
        }
      }

      const close = () => {
        ctx.ui.useFixedFloat().hide()
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          close()
        }
      }

      ctx.lib.vue.watch(() => currentTab.value, buildList)
      ctx.lib.vue.watch(() => ctx.store.state.currentRepoIndexStatus?.status.ready, () => buildList(currentTab.value))
      ctx.lib.vue.watch(() => [ctx.store.state.currentFile?.repo, ctx.store.state.currentRepo?.name], (val) => {
        if (val[0] !== currentFileRepo || val[1] !== currentFileRepo) {
          close()
        }
      }, { flush: 'post' })

      ctx.lib.vue.onMounted(() => {
        buildList(currentTab.value)

        ctx.registerHook('GLOBAL_KEYDOWN', handleKeyDown)
      })

      ctx.lib.vue.onBeforeUnmount(() => {
        ctx.removeHook('GLOBAL_KEYDOWN', handleKeyDown)
      })

      return () => <IndexStatus>
        <div class="view-links-close-btn" onClick={close} title={$t.value('close') + ' ' + ctx.keybinding.getKeyLabel(ctx.keybinding.Escape)}>
          <SvgIcon name="times" width="14px" height='14px' />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', borderBottom: '1px solid var(--g-color-85)', padding: '5px 0' }}>
          <GroupTabs tabs={[
            { value: 'links', label: $t.value('view-links.links') },
            { value: 'back-links', label: $t.value('view-links.back-links') },
          ]} size="small" modelValue={currentTab.value} onUpdate:model-value={(v: any) => { currentTab.value = v }} />
        </div>
        {(list.value && list.value.length) ? <ol style={{ maxHeight: '60vh', overflowY: 'auto', margin: '0', padding: '8px 10px 8px 40px', backgroundColor: ' rgba(var(--g-foreground-color-rgb), 0.025)', overflowWrap: 'break-word' }}>
          {list.value.map(item => {
            return <li class="view-links-ol-li">
              <a href="javascript:void(0)" onClick={e => {
                e.preventDefault()
                ctx.doc.switchDoc(item.doc, { source: 'view-links', position: item.position })
              }} title={item.doc.path}>{item.doc.name}</a>
            </li>
          })}
        </ol> : <div style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--g-color-45)', padding: '20px 0 10px', fontSize: '14px' }}>
          {list.value ? <span>{$t.value('view-links.no-result')}</span> : <span>Loading...</span>}
        </div>}
        {title && <div style={{ textAlign: 'center', color: 'var(--g-color-30)', padding: '10px', fontSize: '13px', borderTop: '1px solid var(--g-color-85)', overflowWrap: 'break-word' }}>
          {title.value} &nbsp;&nbsp;
          <a href="javascript:void(0)" onClick={e => {
            e.preventDefault()
            ctx.indexer.rebuildCurrentRepo()
          }} title={`Indexed: ${ctx.store.state.currentRepoIndexStatus?.status?.indexed}, Total: ${ctx.store.state.currentRepoIndexStatus?.status?.total}, Cost: ${ctx.store.state.currentRepoIndexStatus?.status?.cost}ms`}>
            {$t.value('view-links.re-index')}
          </a>
        </div>}
      </IndexStatus>
    })

    function showLinks () {
      ctx.ui.useFixedFloat().show({
        right: '20px',
        top: ctx.env.isElectron ? '66px' : '36px',
        component: ViewLinksComponent,
        closeOnBlur: false,
        onBlur (byClickSelf) {
          if (!byClickSelf && ctx.store.state.currentRepoIndexStatus?.repo !== ctx.store.state.currentFile?.repo) {
            ctx.ui.useFixedFloat().hide()
          }
        },
      })
    }

    function when () {
      const currentRepoName = ctx.store.state.currentRepo?.name
      const currentFileRepoName = ctx.store.state.currentFile?.repo

      const result = !ctx.args.FLAG_DEMO && // not in demo mode
        ctx.args.MODE === 'normal' && // in normal mode
        currentRepoName && // has current repo
        currentFileRepoName && // has current file
        currentFileRepoName !== ctx.args.HELP_REPO_NAME && // current file is not in help repo
        !currentFileRepoName.startsWith(ROOT_REPO_NAME_PREFIX) // current file is not in root repo

      return !!result
    }

    ctx.action.registerAction({
      name: actionName,
      forUser: true,
      description: ctx.i18n.t('command-desc.plugin_view-links_view-document-links'),
      handler: showLinks,
      when,
    })

    ctx.workbench.FileTabs.tapActionBtns(btns => {
      if (when()) {
        btns.push({ type: 'separator' })
        btns.push({
          type: 'normal',
          icon: 'link-solid',
          title: 'Links',
          onClick: () => {
            ctx.action.getActionHandler(actionName)()
          },
        })
        btns.push({ type: 'separator' })
      }
    })

    ctx.theme.addStyles(`
      .view-links-close-btn {
        position: absolute;
        right: 3px;
        top: 3px;
        width: 20px;
        height: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        color: var(--g-color-30);
      }

      .view-links-close-btn:hover {
        color: var(--g-color-0);
        background-color: var(--g-color-80);
        border-radius: 50%;
      }

      .view-links-ol-li {
        line-height: 1.4;
      }

      .view-links-ol-li::marker {
        font-size: 12px
      }
    `)
  }
} as Plugin
