<template>
  <XMask :mask-closeable="false" :style="{paddingTop: '7vh'}" :show="!!managerVisible" @close="hide">
    <div class="wrapper">
      <div class="title-bar">
        <h3>{{ $t('keyboard-shortcuts.keyboard-shortcuts') }}</h3>
        <group-tabs :tabs="tabs" size="small" v-model="tab" />
        <input v-model="filterStr" :placeholder="$t('keyboard-shortcuts.search')" />
      </div>
      <div class="list" ref="listRef">
        <table cellspacing="0">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ $t('keyboard-shortcuts.command') }}</th>
              <th>{{ $t('keyboard-shortcuts.keybinding') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody v-if="items.length">
            <tr v-for="(item, i) in items" :key="item.command" class="item" :data-id="item.command">
              <td><code>{{ i + 1 }}</code></td>
              <td :class="{unavailable: item.unavailable}">
                <div v-if="item.description">{{ item.description }}</div>
                <div><code :class="{desc: !!item.description}">{{ item.command }}</code></div>
              </td>
              <td :class="{modified: item.modified}">
                <kbd v-for="key in item.keys" :key="key">{{ key }}</kbd>
                <i v-if="item.keys.length === 0">{{ t('keyboard-shortcuts.not-set') }}</i>
                <a href="javascript:void(0)" v-else-if="getConflictCommands(item.keybinding.split('+'), item.binding).length > 1" @click="viewConflict(item.keybinding.split('+'), item.binding)">
                  <i>{{ t('keyboard-shortcuts.conflict') }}</i>
                </a>
              </td>
              <td v-if="item.unavailable">
                <!-- reset to clear -->
                <a v-if="item.modified" href="javascript:void(0)" @click="resetShortcuts(item.command)">{{ $t('keyboard-shortcuts.clear') }}</a>
              </td>
              <td v-else>
                <a href="javascript:void(0)" @click="editShortcuts(item.command)">{{ $t('keyboard-shortcuts.change') }}</a>
                <a href="javascript:void(0)" @click="clearShortcuts(item.command)">{{ $t('keyboard-shortcuts.clear') }}</a>
                <a v-if="item.modified" href="javascript:void(0)" @click="resetShortcuts(item.command)">{{ $t('keyboard-shortcuts.reset') }}</a>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="4" style="text-align: center; color: var(--g-color-50)">
                {{ $t('keyboard-shortcuts.empty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="action">
        <label><input type="checkbox" v-model="nonUsLayout" @change="changeNonUsLayout" />{{ $t('keyboard-shortcuts.non-us-layout') }}</label>
        <button class="btn primary tr" @click="hide">{{$t('close')}}</button>
      </div>
    </div>
  </XMask>
  <div v-if="currentCommand" class="recorder" @click="currentCommand = ''">
    <div>{{ $t('keyboard-shortcuts.recorder.tip') }}</div>
    <input @click.stop v-auto-focus :value="shortcuts?.join(' + ')" />
    <div v-if="shortcuts" class="output">
      {{ getKeysLabel(shortcuts) }}
    </div>
    <div class="conflict" v-if="conflictCommands.length" @click="viewConflict(shortcuts, nonUsLayout ? serializeKeybinding(recordedBinding) : null)">
      {{ $t('keyboard-shortcuts.recorder.conflict-commands', String(conflictCommands.length)) }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { keyBy } from 'lodash-es'
import { computed, h, onUnmounted, ref, shallowRef, watch, watchEffect } from 'vue'
import { getDefaultApplicationAccelerators } from '@share/misc'
import { getRawActions, registerAction, removeAction } from '@fe/core/action'
import { Alt, Cmd, Ctrl, Meta, Shift, Win, disableShortcuts, enableShortcuts, getKeyLabel, getKeysLabel } from '@fe/core/keybinding'
import { recordNonUsKey } from '@fe/support/non-us-keybinding'
import { isMacOS, isOtherOS, isWindows } from '@fe/support/env'
import { useModal } from '@fe/support/ui/modal'
import { getSetting, setSetting } from '@fe/services/setting'
import { getCurrentLanguage, useI18n } from '@fe/services/i18n'
import { lookupKeybindingKeys, whenEditorReady } from '@fe/services/editor'
import { getLogger } from '@fe/utils'
import { getDisplayKeybinding, getEffectiveKeybinding, serializeKeybinding } from '@share/keybinding'
import type { RecordedKeybinding } from '@share/keybinding'
import type { Action, Keybinding } from '@fe/types'

import XMask from '@fe/components/Mask.vue'
import GroupTabs from '@fe/components/GroupTabs.vue'

type Item = {
  command: string,
  description?: string,
  keys: string[],
  keybinding: string,
  effectiveKeybinding: string,
  binding?: string | null,
  modified: boolean,
  unavailable?: boolean,
}

type Tab = 'workbench' | 'editor' | 'application'

type XCommand = Action & { type: Tab }

const { $t, t } = useI18n()

const tabs = computed<{ label: string, value: Tab }[]>(() => [
  { label: $t.value('keyboard-shortcuts.workbench'), value: 'workbench' },
  { label: $t.value('keyboard-shortcuts.editor'), value: 'editor' },
  { label: $t.value('keyboard-shortcuts.application'), value: 'application' },
])

const logger = getLogger('keyboard-shortcuts')

const listRef = ref<HTMLElement | null>(null)
const tab = ref<Tab>('workbench')
const managerVisible = ref(false)
const nonUsLayout = ref(false)
const currentCommand = ref('')
const filterStr = ref('')
const shortcuts = shallowRef<string[] | null>(null)
const recordedBinding = shallowRef<RecordedKeybinding | null>(null)
const commands = shallowRef<XCommand[]>([])
const keybindings = shallowRef<Keybinding[]>([])

const currentTypeKeybindings = computed(() => {
  return keybindings.value.filter(x => x.type === tab.value)
})

const list = computed<Item[]>(() => {
  const bindings = keyBy(currentTypeKeybindings.value, 'command')
  const _tab = tab.value
  const _commands = commands.value
  const _currentTypeKeybindings = currentTypeKeybindings.value

  const data = _commands.filter(x => x.type === _tab).map((item) => {
    const modified = !!bindings[item.name]
    const keys = modified
      ? (nonUsLayout.value ? getDisplayKeybinding(bindings[item.name].keys, bindings[item.name].binding) : bindings[item.name].keys)?.split('+') || []
      : item.keys

    return {
      command: item.name,
      description: item.description,
      keys: (keys || []).map(getKeyLabel),
      keybinding: keys?.join('+') || '',
      effectiveKeybinding: (nonUsLayout.value ? getEffectiveKeybinding(keys?.join('+'), bindings[item.name]?.binding) : keys?.join('+'))?.toLowerCase() || '',
      binding: bindings[item.name]?.binding,
      modified,
    }
  })

  // add unavailable commands

  const availableIds = data.map(x => x.command)
  const unavailable = _currentTypeKeybindings.filter(x => !availableIds.includes(x.command))

  return data.concat(unavailable.map((item) => {
    const keys = (nonUsLayout.value ? getDisplayKeybinding(item.keys, item.binding) : item.keys)?.split('+') || []
    return {
      command: item.command,
      description: t('keyboard-shortcuts.unavailable'),
      keys: keys.map(getKeyLabel),
      keybinding: keys.join('+'),
      effectiveKeybinding: (nonUsLayout.value ? getEffectiveKeybinding(keys.join('+'), item.binding) : keys.join('+'))?.toLowerCase() || '',
      binding: item.binding,
      modified: true,
      unavailable: true,
    }
  }))
})

const items = computed(() => {
  return list.value.filter(x => {
    const str = filterStr.value.trim().toLowerCase()
    if (!str) {
      return true
    }

    // show all modified commands
    if (str === '*') {
      return x.modified
    }

    if (str === '#') {
      return getConflictCommands(x.keybinding.split('+'), x.binding).length > 1
    }

    return x.command.toLowerCase().includes(filterStr.value) ||
      (x.description || '').toLowerCase().includes(filterStr.value) ||
      x.keybinding.toLowerCase().includes(filterStr.value)
  })
})

function getConflictCommands (keys: (number | string)[], binding?: string | null) {
  const commands = list.value.filter(x => !x.unavailable)

  // do not check Enter, Esc conflict for editor commands
  if (tab.value === 'editor' && keys.length === 1 && ['Enter', 'Esc'].includes(keys[0] as any)) {
    return []
  }

  if (!nonUsLayout.value) {
    const keyLabels = getKeysLabel(keys)
    return keyLabels ? commands.filter(x => getKeysLabel(x.keys) === keyLabels) : []
  }

  const effective = getEffectiveKeybinding(keys.join('+'), binding)?.toLowerCase()
  if (!effective) {
    return []
  }

  return commands.filter(x => x.effectiveKeybinding === effective)
}

const conflictCommands = computed(() => {
  return getConflictCommands(shortcuts.value || [], nonUsLayout.value ? serializeKeybinding(recordedBinding.value) : null)
})

async function refresh () {
  if (tab.value === 'workbench') {
    commands.value = getRawActions().filter(x => x.forUser).map(x => ({ ...x, type: 'workbench' as Tab }))
  } else if (tab.value === 'editor') {
    const { editor } = await whenEditorReady()
    commands.value = (editor as any).getActions().map((x: any) => {
      const keys = lookupKeybindingKeys(x.id)

      return {
        type: 'editor' as Tab,
        name: x.id,
        description: x.label,
        keys,
        handler: null,
      }
    })
  } else if (tab.value === 'application') {
    commands.value = getDefaultApplicationAccelerators(isMacOS ? 'darwin' : isWindows ? 'win32' : 'linux', getCurrentLanguage())
      .map(x => ({
        type: 'application' as Tab,
        name: x.command,
        keys: x.accelerator?.split('+'),
        description: x.description,
        handler: () => 0,
      }))
  }

  keybindings.value = getSetting('keybindings', [])
}

watch(tab, refresh)
watch(tab, () => {
  filterStr.value = ''
})

function show () {
  filterStr.value = ''
  nonUsLayout.value = getSetting('keybindings.non-us-layout', false)
  managerVisible.value = true
  refresh()
}

async function changeNonUsLayout () {
  await setSetting('keybindings.non-us-layout', nonUsLayout.value)
  refresh()
}

function hide () {
  managerVisible.value = false
  commands.value = []
  keybindings.value = []
}

function revealCommand (commandId: string) {
  filterStr.value = ''
  const el = listRef.value?.querySelector(`[data-id="${commandId}"]`) as HTMLElement
  if (el) {
    el.style.background = '#ffeb3b'
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      el.style.background = ''
    }, 1500)
  }
}

function viewConflict (keys: string[] | null, binding?: string | null) {
  if (!keys) {
    return
  }

  const commands = getConflictCommands(keys, binding)
  useModal().alert({
    title: t('keyboard-shortcuts.conflict-title', getKeysLabel(keys)),
    component: h('div', [
      h('p', t('keyboard-shortcuts.conflict-commands')),
      h('ol', commands.map(x => h('li', h('a', { href: 'javascript:void(0)', onClick: () => revealCommand(x.command) }, x.command)))),
    ]),
  })
}

async function updateCommand (command: string, keys: string[] | null, binding: RecordedKeybinding | null = null) {
  logger.debug('updateCommand', command, keys, binding)

  const data = getSetting('keybindings', []).filter(x => (
    x.command !== command || x.type !== tab.value
  ))

  if (keys) {
    const keyString = keys.join('+') || null
    const entry: Keybinding = { type: tab.value, command, keys: keyString }
    const bindingString = nonUsLayout.value ? serializeKeybinding(binding) : null
    if (bindingString) {
      entry.binding = bindingString
    }
    data.push(entry)
  }

  keybindings.value = data

  await setSetting('keybindings', data)

  refresh()
}

async function clearShortcuts (command: string) {
  updateCommand(command, [])
}

function editShortcuts (command: string) {
  currentCommand.value = command
  recordedBinding.value = null
}

function resetShortcuts (command: string) {
  updateCommand(command, null)
}

function recordKey (e: KeyboardEvent) {
  if (nonUsLayout.value && (e.isComposing || e.repeat || e.key === 'Process')) {
    return
  }

  e.preventDefault()
  e.stopPropagation()

  if (e.key === 'Escape') {
    currentCommand.value = ''
    shortcuts.value = null
    recordedBinding.value = null
    return
  }

  const modifiers: Record<string, boolean> = {
    [Cmd]: isMacOS ? e.metaKey : false,
    [Win]: isWindows ? e.metaKey : false,
    [Meta]: isOtherOS ? e.metaKey : false,
    [Ctrl]: e.ctrlKey,
    [Alt]: e.altKey,
    [Shift]: e.shiftKey,
  }

  const keys = Object.keys(modifiers).filter((key) => modifiers[key])

  if (nonUsLayout.value && e.key === 'Enter' && keys.length === 0) {
    finishRecording()
    return
  }

  if (nonUsLayout.value) {
    const recorded = recordNonUsKey(e)
    if (recorded) {
      keys.push(recorded.key)
      recordedBinding.value = recorded.binding
    } else {
      recordedBinding.value = null
    }
  } else if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
    let val = e.code
    if (val.startsWith('Key')) val = val.slice(3)
    else if (val.startsWith('Digit')) val = val.slice(5)
    else if (val.startsWith('Arrow')) val = val.slice(5)
    else if (val.startsWith('Numpad')) val = e.code
    else if (val === 'Equal') val = '='
    else if ('`-=[]\\;\',./{}|:"<>?~!@#$%^&*()_'.includes(e.key)) val = e.key
    keys.push(val)
  }

  if (!nonUsLayout.value && e.key === 'Enter' && keys.length <= 1) {
    finishRecording()
  } else {
    shortcuts.value = keys
  }
}

function finishRecording () {
  if (currentCommand.value && shortcuts.value && (!nonUsLayout.value || shortcuts.value.length)) {
    updateCommand(currentCommand.value, shortcuts.value, nonUsLayout.value ? recordedBinding.value : null)
  }
  currentCommand.value = ''
  shortcuts.value = null
  recordedBinding.value = null
}

watchEffect(() => {
  if (currentCommand.value) {
    disableShortcuts()
    shortcuts.value = null
    window.addEventListener('keydown', recordKey, true)
  } else {
    window.removeEventListener('keydown', recordKey, true)
    enableShortcuts()
  }
})

registerAction({
  name: 'keyboard-shortcuts.show-manager',
  description: t('command-desc.keyboard-shortcuts_show-manager'),
  handler: show,
  forUser: true,
  forMcp: true,
  mcpDescription: 'Show keyboard shortcuts manager. No args. No return.'
})

onUnmounted(() => {
  removeAction('keyboard-shortcuts.show-manager')
})
</script>

<style lang="scss" scoped>
@use '@fe/styles/mixins.scss' as *;

.wrapper {
  width: 90vw;
  max-width: 1024px;
  background: var(--g-color-backdrop);
  backdrop-filter: var(--g-backdrop-filter);
  margin: auto;
  padding: 10px;
  color: var(--g-color-5);
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
  position: relative;
}

.title-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  h3 {
    margin-top: 0;
    margin-bottom: 0px;
    margin-right: 3em;
    position: absolute;
    left: 0;
  }

  input {
    position: absolute;
    right: 0;
    max-width: 200px;
    font-size: 14px !important;
  }
}

.list {
  margin-top: 20px;
  max-height: calc(100vh - 7vh - 200px);
  overflow-y: auto;
}

table {
  width: 100%;

  thead > tr {
    position: sticky;
    top: 0;
    background: var(--g-color-90);
    z-index: 1;
  }

  th, td {
    text-align: left;
    padding: 8px 8px;
    border-bottom: 1px solid var(--g-color-84);
    position: relative;
  }

  tbody > tr:hover {
    background: var(--g-color-90);

    td:last-child a {
      opacity: 1;
    }
  }

  th:first-child, td:first-child {
    width: 30px;
    text-align: right;
    padding-right: 6px;
  }

  th, td:last-child {
    white-space: nowrap;
  }

  td:last-child {
    width: 100px;
  }

  td:last-child a {
    opacity: 0;
  }

  td:first-child code {
    color: var(--g-color-40);
  }

  td.unavailable {
    text-decoration: line-through;
  }

  td.modified::before {
    content: '*';
    position: absolute;
    color: var(--g-color-35);
    margin-left: -12px;
    margin-top: 2px;
  }

  .desc, i {
    color: var(--g-color-50);
    font-style: italic;
    font-size: 14px;
  }

  .desc {
    word-break: break-all;
  }

  a {
    margin-right: 8px;
    font-size: 14px;
  }

  kbd {
    border: 1px solid var(--g-color-80);
    border-radius: var(--g-border-radius);
    box-shadow: inset 0 -1px 0 0 var(--g-color-50);
    background: var(--g-color-90);
    margin-right: 8px;
    padding: 2px 8px;
    font-size: 14px;
  }
}

@include dark-theme {
  table {
    tbody > tr:hover {
      background: var(--g-color-80);
    }

    th, td {
      border-bottom: 1px solid var(--g-color-70);
    }

    kbd {
      background: var(--g-color-70);
    }
  }
}

.action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;

  label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.recorder {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 210000000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: var(--g-backdrop-filter);
  background: rgba(var(--g-color-77-rgb), 0.3);

  input {
    width: 90vw;
    max-width: 300px;
    text-align: center;
    margin: 20px !important;
  }

  .conflict {
    text-decoration: underline;
    cursor: pointer;
  }
}
</style>
