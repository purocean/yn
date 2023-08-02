<template>
  <XMask :mask-closeable="false" :style="{paddingTop: '7vh'}" :show="!!managerVisible" @close="hide">
    <div class="wrapper">
      <div class="title-bar">
        <h3>{{ $t('keyboard-shortcuts.keyboard-shortcuts') }}</h3>
        <group-tabs :tabs="tabs" v-model="tab" />
      </div>
      <div v-if="tab === 'workbench'" class="list">
        <table cellspacing="0">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ $t('keyboard-shortcuts.command') }}</th>
              <th>{{ $t('keyboard-shortcuts.keybinding') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in list" :key="item.command" class="item">
              <td><code>{{ i + 1 }}</code></td>
              <td :class="{unavailable: item.unavailable}">
                <div v-if="item.description">{{ item.description }}</div>
                <div><code :class="{desc: !!item.description}">{{ item.command }}</code></div>
              </td>
              <td :class="{modified: item.modified}">
                <kbd v-for="key in item.keys" :key="key">{{ key }}</kbd>
                <i v-if="item.keys.length === 0">{{ t('keyboard-shortcuts.not-set') }}</i>
                <a href="javascript:void(0)" v-else-if="getConflictCommands(item.keys).length > 1" @click="viewConflict(item.keys)">
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
        </table>
      </div>
      <div v-else class="list" style="text-align: center;">
        Coming soon...
      </div>
      <div class="action">
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
    <div class="conflict" v-if="conflictCommands.length" @click="viewConflict(shortcuts)">
      {{ $t('keyboard-shortcuts.recorder.conflict-commands', String(conflictCommands.length)) }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { keyBy } from 'lodash-es'
import { computed, h, onUnmounted, ref, shallowRef, watchEffect } from 'vue'
import { registerAction, removeAction } from '@fe/core/action'
import { Alt, Cmd, Ctrl, Meta, Shift, Win, disableShortcuts, enableShortcuts, getKeyLabel, getKeysLabel, getRawCommands } from '@fe/core/command'
import { isMacOS, isOtherOS, isWindows } from '@fe/support/env'
import { useModal } from '@fe/support/ui/modal'
import { getSetting, setSetting } from '@fe/services/setting'
import { useI18n } from '@fe/services/i18n'
import { getLogger } from '@fe/utils'
import type { Command, Keybinding } from '@fe/types'

import XMask from '@fe/components/Mask.vue'
import GroupTabs from '@fe/components/GroupTabs.vue'

type Item = {
  command: string,
  description?: string,
  keys: string[],
  modified: boolean,
  unavailable?: boolean,
}

type Tab = 'workbench' | 'editor' | 'application'

const tabs: { label: string, value: Tab }[] = [
  { label: '工作台', value: 'workbench' },
  { label: '编辑器', value: 'editor' },
  { label: '应用', value: 'application' },
]

const { $t, t } = useI18n()
const logger = getLogger('keyboard-shortcuts')

const tab = ref<Tab>('workbench')
const managerVisible = ref(false)
const currentCommand = ref('')
const shortcuts = shallowRef<string[] | null>(null)
const commands = shallowRef<Command[]>([])
const keybindings = shallowRef<Keybinding[]>([])

const currentTypeKeybindings = computed(() => {
  return keybindings.value.filter(x => x.type === tab.value)
})

const list = computed<Item[]>(() => {
  const bindings = keyBy(currentTypeKeybindings.value, 'command')

  const data = commands.value.map((item) => {
    const modified = !!bindings[item.id]
    const keys = modified ? (bindings[item.id].keys?.split('+') || []) || item.keys : item.keys

    return {
      command: item.id,
      description: item.description,
      keys: (keys || []).map(getKeyLabel),
      modified,
    }
  })

  // add unavailable commands

  const availableIds = data.map(x => x.command)
  const unavailable = keybindings.value.filter(x => !availableIds.includes(x.command))

  return data.concat(unavailable.map((item) => {
    return {
      command: item.command,
      description: '不可用',
      keys: (item.keys?.split('+') || []).map(getKeyLabel),
      modified: true,
      unavailable: true,
    }
  }))
})

function getConflictCommands (keys: (number | string)[]) {
  const keyLabels = getKeysLabel(keys)
  const commands = list.value.filter(x => !x.unavailable)

  if (!keyLabels) {
    return []
  }

  return commands.filter(x => getKeysLabel(x.keys) === keyLabels)
}

const conflictCommands = computed(() => {
  return getConflictCommands(shortcuts.value || [])
})

function refresh () {
  commands.value = getRawCommands().filter(x => x.configurable)
  keybindings.value = getSetting('keybindings', [])
}

function show () {
  managerVisible.value = true
  refresh()
}

function hide () {
  managerVisible.value = false
  commands.value = []
  keybindings.value = []
}

function viewConflict (keys: string[] | null) {
  if (!keys) {
    return
  }

  const commands = getConflictCommands(keys)
  const message = commands.map(x => x.command).join('\n')
  useModal().alert({
    title: t('keyboard-shortcuts.conflict-title', getKeysLabel(keys)),
    component: h('div', [
      h('p', t('keyboard-shortcuts.conflict-commands')),
      h('pre', { style: 'max-height: 300px; overflow-y: auto' }, message),
    ]),
  })
}

async function updateCommand (command: string, keys: string[] | null) {
  logger.debug('updateCommand', command, keys)

  const data = getSetting('keybindings', []).filter(x => (
    x.command !== command || x.type !== tab.value
  ))

  if (keys) {
    data.push({ type: tab.value, command, keys: keys.join('+') || null })
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
}

function resetShortcuts (command: string) {
  updateCommand(command, null)
}

function recordKey (e: KeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()

  if (e.key === 'Escape') {
    currentCommand.value = ''
    shortcuts.value = null
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

  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
    let val = e.code
    if (val.startsWith('Key')) {
      val = val.slice(3)
    } else if (val.startsWith('Digit')) {
      val = val.slice(5)
    } else if (val.startsWith('Numpad')) {
      val = val.slice(6)
    } else if (val === 'Equal') { // avoid conflict with '+'
      val = '='
    } else if ('`-=[]\\;\',./{}|:"<>?~!@#$%^&*()_'.includes(e.key)) {
      val = e.key
    }

    keys.push(val)
  }

  if (e.key === 'Enter' && keys.length <= 1) {
    if (currentCommand.value && shortcuts.value && shortcuts.value.length) {
      updateCommand(currentCommand.value, shortcuts.value)
    }

    currentCommand.value = ''
    shortcuts.value = null
  } else {
    shortcuts.value = keys
  }
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

registerAction({ name: 'keyboard-shortcuts.show-manager', handler: show })

onUnmounted(() => {
  removeAction('keyboard-shortcuts.show-manager')
})
</script>

<style lang="scss" scoped>
@import '@fe/styles/mixins.scss';

.wrapper {
  width: 90vw;
  max-width: 900px;
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

  .tabs {
    display: inline-flex;
    margin-bottom: 0;
    z-index: 1;
    flex: none;
    justify-self: center;

    ::v-deep(.tab) {
      line-height: 1.5;
      font-size: 14px;
    }
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

  a {
    text-decoration: none;
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
  justify-content: flex-end;
  padding-top: 10px;
}

.recorder {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 900000;
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
