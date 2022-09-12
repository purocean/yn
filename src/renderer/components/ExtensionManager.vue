<template>
  <XMask :mask-closeable="false" :style="{paddingTop: '7vh'}" :show="!!showManager" @close="hide">
    <div class="wrapper">
      <div class="body">
        <div class="side">
          <group-tabs class="tabs" :tabs="listTypes" v-model="listType" />
          <div v-if="extensions.length > 0" class="list">
            <div
              v-for="item in extensions"
              :key="item.id"
              :class="{item: true, selected: item.id === currentExtension?.id}"
              @click="choose(item.id)">
              <div class="left">
                <div v-if="item.icon" class="icon-extension" :style="{ 'background-size': '98% 98%', 'background-image': `url(${item.icon})` }" />
                <div v-else class="icon-extension" />
              </div>
              <div class="right">
                <div class="title">
                  <div v-if="item.isDev" class="name" style="color: #f44336">DEV-{{ item.displayName }}</div>
                  <div v-else class="name">{{ item.displayName }}</div>
                  <div class="version">
                    <span>{{ item.version }}</span>
                    <span class="upgradable" v-if="item.upgradable">&nbsp; {{ $t('extension.upgradable') }}</span>
                  </div>
                </div>
                <div class="description">{{ item.description }}</div>
                <div class="bottom">
                  <div v-if="item.origin === 'official'" class="author"><i>Yank Note</i></div>
                  <div v-else class="author" >{{ item.author.name }}</div>
                  <div class="status-list">
                    <div v-if="!item.compatible.value" class="status">{{ $t('extension.incompatible') }}</div>
                    <div v-if="!item.installed" class="status">{{ $t('extension.not-installed') }}</div>
                    <div v-if="item.installed && item.enabled" class="status">
                      <span v-if="item.activationTime" :title="$t('extension.activation-time')">
                        {{ `${item.activationTime.toFixed(2)}ms` }}
                      </span>
                      <span v-else>{{ $t('extension.enabled') }}</span>
                    </div>
                    <div v-if="item.installed && !item.enabled" class="status warning">{{ $t('extension.disabled') }}</div>
                    <div v-if="item.dirty" class="status warning">{{ $t('extension.reload-required') }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="list">
            <div class="placeholder">{{ $t(registryExtensions ? 'extension.no-extension' : 'loading') }}</div>
          </div>
        </div>
        <div class="detail">
          <template v-if="currentExtension">
            <div class="info">
              <div class="left">
                <div v-if="currentExtension.icon" class="icon-extension" :style="{ 'background-size': '94% 94%', 'background-image': `url(${currentExtension.icon})` }" />
                <div v-else class="icon-extension" />
              </div>
              <div class="right">
                <div class="title">
                  <div v-if="currentExtension.isDev" class="name" style="color: #f44336">DEV-{{ currentExtension.displayName }}</div>
                  <div v-else class="name">{{ currentExtension.displayName }}</div>
                  <div class="version" v-if="currentExtension.version">
                    <span>{{ currentExtension.id }}@{{ currentExtension.version }}</span>
                    <span class="upgradable" v-if="currentExtension.upgradable">&nbsp; {{ $t('extension.upgradable') }} {{ currentExtension.latestVersion }}</span>
                  </div>
                </div>
                <div class="tags">
                  <div v-if="currentExtension.origin === 'unknown'" class="tag">
                    <span>{{ $t('extension.origin') }}</span>
                    <span class="warning-tag">{{ $t('extension.unknown') }}</span>
                  </div>
                  <div class="tag">
                    <span>{{ $t('extension.author') }}</span>
                    <span v-if="currentExtension.origin === 'official'"><i>Yank Note</i></span>
                    <span v-else>{{ currentExtension.author.name }}</span>
                  </div>
                  <div v-if="currentExtension.latestVersion" class="tag">
                    <span>{{ $t('extension.latest-version') }}</span>
                    <span>{{ currentExtension.latestVersion }}</span>
                  </div>
                  <div v-if="currentExtension.dist.unpackedSize" class="tag">
                    <span>{{ $t('extension.unpacked-size') }}</span>
                    <span v-if="currentExtension.dist.unpackedSize >= 1048576">{{ (currentExtension.dist.unpackedSize / 1048576).toFixed(2) }}MiB</span>
                    <span v-else>{{ (currentExtension.dist.unpackedSize / 1024).toFixed(2) }}KiB</span>
                  </div>
                  <div
                    v-if="currentExtension.homepage && currentExtension.homepage.split('/')[2]"
                    class="tag"
                    style="cursor: pointer;"
                    @click="openUrl(currentExtension?.homepage)"
                  >
                    <span>{{ $t('extension.homepage') }}</span>
                    <span>{{ currentExtension.homepage.split('/')[2] }}</span>
                  </div>
                  <div v-if="currentExtension.license" class="tag">
                    <span>License</span>
                    <span>{{ currentExtension.license }}</span>
                  </div>
                  <div
                    v-if="currentExtension.dist.unpackedSize"
                    class="tag"
                    style="cursor: pointer;"
                    @click="openUrl(`https://www.npmjs.com/package/${currentExtension?.id}`)"
                  >
                    <img alt="npm" :src="`https://img.shields.io/npm/dy/${currentExtension.id}?color=%234180bd&label=Download&style=flat-square`">
                  </div>
                  <div
                    v-if="currentExtension.requirements.premium"
                    class="tag"
                    style="cursor: pointer;"
                    @click="showPremium()"
                  >
                    <span>{{ $t('extension.requirement') }}</span>
                    <span class="warning-tag">{{ $t('premium.premium') }}</span>
                  </div>
                  <div
                    v-if="currentExtension.requirements.terminal"
                    class="tag"
                    style="cursor: pointer;"
                    @click="openUrl(URL_MAS_LIMITATION)"
                  >
                    <span>{{ $t('extension.requirement') }}</span>
                    <span class="warning-tag">Terminal</span>
                  </div>
                </div>
                <div class="description">{{ currentExtension.description }}</div>
                <div v-if="installing" class="actions"><i>{{ $t('extension.installing') }} <b>{{installing}}</b></i></div>
                <div v-else-if="uninstalling" class="actions"><i>{{ $t('extension.uninstalling') }}</i></div>
                <div v-else class="actions">
                  <template v-if="currentExtension.dirty">
                    <button class="small" @click="reload">{{$t('extension.reload')}}</button>
                    <i>{{ $t('extension.reload-required') }}</i>
                  </template>
                  <template v-else>
                    <template v-if="!currentExtension.installed">
                      <button class="small" :disabled="!currentExtension.compatible.value" @click="install(currentExtension)">{{ $t('extension.install') }}</button>
                    </template>
                    <template v-else>
                      <button class="small" @click="uninstall(currentExtension)">{{ $t('extension.uninstall') }}</button>
                      <button v-if="currentExtension.enabled" class="small" @click="disable(currentExtension)">{{ $t('extension.disable') }}</button>
                      <button v-else-if="currentExtension.compatible.value" class="small" @click="enable(currentExtension)">{{ $t('extension.enable') }}</button>
                      <button v-if="currentExtension.upgradable" :disabled="!currentExtension.newVersionCompatible?.value" class="small" @click="upgrade(currentExtension)">{{ $t('extension.upgrade') }}</button>
                    </template>
                    <i v-if="!currentExtension.compatible.value">{{currentExtension.compatible.reason}}</i>
                    <i v-if="currentExtension.upgradable && !currentExtension.newVersionCompatible?.value">{{currentExtension.newVersionCompatible?.reason}}</i>
                  </template>
                </div>
              </div>
            </div>
            <div class="content-wrapper">
              <group-tabs class="tabs" :tabs="contentTypes" v-model="contentType" />
              <template v-if="useNpmjsReadmePage">
                <div v-show="iframeLoaded" class="content">
                  <iframe
                    @load="iframeOnload"
                    sandbox="allow-scripts allow-popups allow-same-origin"
                    referrerpolicy="no-referrer"
                    :src="`/api/proxy?url=https://www.npmjs.com/package/${currentExtension.id}`"
                  />
                </div>
                <div v-if="!iframeLoaded" class="placeholder">{{ $t('loading') }}</div>
              </template>
              <template v-else>
                <div v-show="iframeLoaded" class="content">
                  <iframe
                    v-if="contentMap[contentType][currentExtension.id]"
                    @load="iframeOnload"
                    sandbox="allow-scripts allow-popups allow-same-origin"
                    referrerpolicy="no-referrer"
                    :srcdoc="contentMap[contentType][currentExtension.id] || ''"
                  />
                </div>
                <div v-if="!iframeLoaded" class="placeholder">{{ $t('loading') }}</div>
              </template>
            </div>
          </template>
          <div v-else class="placeholder">{{ $t('extension.extension-manager') }}</div>
          <div class="dialog-actions">
            <div class="left">
              <b>{{$t('extension.registry')}}:</b>
              <select v-model="currentRegistry">
                <option
                  v-for="hostname in registries"
                  :key="hostname"
                  :value="hostname"
                  :selected="hostname === currentRegistry"
                >{{ hostname }}</option>
              </select>
            </div>
            <div class="right">
              <template v-if="reloadRequired">
                <i>{{ $t('extension.reload-required') }}</i>
                <button class="btn" @click="reload">{{$t('extension.reload')}}</button>
              </template>
              <button class="btn" @click="hide">{{$t('close')}}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </XMask>
</template>

<script lang="ts" setup>
import Markdown from 'markdown-it'
import semver from 'semver'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { getCurrentLanguage, useI18n } from '@fe/services/i18n'
import { getLogger } from '@fe/utils'
import * as api from '@fe/support/api'
import { registerAction, removeAction } from '@fe/core/action'
import XMask from '@fe/components/Mask.vue'
import GroupTabs from '@fe/components/GroupTabs.vue'
import * as extensionManager from '@fe/others/extension'
import type { Extension, ExtensionCompatible } from '@fe/types'
import * as setting from '@fe/services/setting'
import { useModal } from '@fe/support/ui/modal'
import { useToast } from '@fe/support/ui/toast'
import { getPurchased, showPremium } from '@fe/others/premium'
import { FLAG_DISABLE_XTERM, FLAG_MAS, URL_MAS_LIMITATION } from '@fe/support/args'

const markdownIt = Markdown({ linkify: true, breaks: true, html: false })

const logger = getLogger('extension-manager-component')

const { $t, t } = useI18n()

const registries = extensionManager.registries

const showManager = ref(false)
const currentId = ref('')
const iframeLoaded = ref(false)
const installing = ref('')
const uninstalling = ref(false)
const dirty = ref(false)
const registryExtensions = ref<Extension[] | null>(null)
const installedExtensions = ref<Extension[] | null>(null)
const listType = ref<'all' | 'installed'>('all')
const contentType = ref<'readme' | 'changelog'>('readme')
const currentRegistry = ref(setting.getSetting(
  'extension.registry',
  getCurrentLanguage() === 'zh-CN' ? 'registry.npmmirror.com' : 'registry.npmjs.org'
))
const contentMap = ref<{
  readme: Record<string, string | null>;
  changelog: Record<string, string>;
}>({ readme: {}, changelog: {} })

const listTypes = computed(() => [
  { label: $t.value('extension.all'), value: 'all' },
  { label: $t.value('extension.installed'), value: 'installed' },
])

const contentTypes = computed(() => [
  { label: 'README', value: 'readme' },
  { label: 'CHANGELOG', value: 'changelog' },
])

const extensions = computed(() => {
  let list: (Extension & {
    dirty?: boolean,
    upgradable?: boolean,
    latestVersion?: string,
    newVersionCompatible?: ExtensionCompatible,
    activationTime?: number,
  })[] = []

  if (registryExtensions.value) {
    list = registryExtensions.value.map(item => {
      const installedInfo = installedExtensions.value?.find(installed => installed.id === item.id)
      if (installedInfo) {
        const upgradable = installedInfo.version !== item.version && semver.gt(item.version, installedInfo.version)
        return {
          ...item,
          installed: true,
          icon: upgradable ? item.icon : installedInfo.icon,
          readmeUrl: upgradable ? item.readmeUrl : installedInfo.readmeUrl,
          changelogUrl: upgradable ? item.changelogUrl : installedInfo.changelogUrl,
          requirements: upgradable ? item.requirements : installedInfo.requirements,
          enabled: installedInfo.enabled,
          version: installedInfo.version,
          compatible: installedInfo.compatible,
          isDev: installedInfo.isDev,
          newVersionCompatible: item.compatible,
          latestVersion: item.version,
          upgradable,
        }
      }

      return item
    })
  }

  installedExtensions.value?.forEach(item => {
    if (!registryExtensions.value?.some(registry => registry.id === item.id)) {
      list.push(item)
    }
  })

  return list
    .filter(item => listType.value !== 'installed' || item.installed)
    .map(item => {
      const loadStatus = extensionManager.getLoadStatus(item.id)

      return {
        ...item,
        activationTime: loadStatus.activationTime,
        dirty: (loadStatus.themes || loadStatus.plugin || loadStatus.style) &&
          (!item.installed || !item.enabled || item.version !== loadStatus.version),
      }
    })
})

const currentExtension = computed(() => {
  return extensions.value.find(item => item.id === currentId.value)
})

const reloadRequired = computed(() => {
  return dirty.value || extensions.value.some(item => item.dirty)
})

const useNpmjsReadmePage = computed(() => {
  return !!(currentExtension.value &&
    currentExtension.value.dist.unpackedSize &&
    contentType.value === 'readme' &&
    contentMap.value.readme[currentExtension.value.id] === null)
})

function choose (id: string) {
  logger.debug('choose', id)
  if (currentId.value === id) {
    return
  }

  currentId.value = id
  iframeLoaded.value = false
  contentType.value = 'readme'
}

function show (id?: string) {
  if (id) {
    choose(id)
  }

  showManager.value = true
}

function hide () {
  showManager.value = false
}

async function refreshInstalledExtensions () {
  installedExtensions.value = await extensionManager.getInstalledExtensions()
}

async function fetchExtensions () {
  try {
    installedExtensions.value = null
    registryExtensions.value = null
    registryExtensions.value = await extensionManager.getRegistryExtensions(currentRegistry.value)
  } catch (error) {
    logger.error('fetchExtensions', error)
    registryExtensions.value = []
    throw error
  } finally {
    refreshInstalledExtensions()
  }
}

async function fetchContent (type: 'readme' | 'changelog', extension: Extension) {
  if (contentMap.value[type][extension.id]) {
    return
  }

  try {
    const url = type === 'readme' ? extension.readmeUrl : extension.changelogUrl
    const xfetch = /https?:\/\//.test(url) ? api.proxyRequest : window.fetch
    const markdown = await xfetch(url).then(r => {
      if (r.ok === false) {
        logger.warn('fetchContent', r.statusText)
        return '*No Content*'
      }

      return r.text()
    })

    contentMap.value[type][extension.id] = `
      <link rel="stylesheet" href="${location.origin}/github.css">
      <div style="padding: 12px" class="markdown-body">
        ${markdownIt.render(markdown)}
      </div>
    `
  } catch (error: any) {
    logger.error('fetchContent', error)
    if (type === 'readme') {
      // null means empty, load npmjs page instead
      contentMap.value[type][extension.id] = null
    } else {
      contentMap.value[type][extension.id] = error.message
    }
    throw error
  }
}

async function checkOrigin (extension: Extension) {
  if (extension.origin === 'unknown') {
    if (!(await useModal().confirm({
      content: t('extension.unknown-origin-tips'),
      okText: t('extension.enable'),
    }))) {
      throw new Error('canceled')
    }
  }
}

async function checkRequirements (extension: Extension) {
  if (extension.requirements.premium && !getPurchased()) {
    useToast().show('info', t('premium.need-purchase', extension.displayName))
    showPremium()
    throw new Error('Extension requires premium')
  }

  if (extension.requirements.terminal && (FLAG_DISABLE_XTERM || FLAG_MAS)) {
    if (await useModal().confirm({
      content: t('not-support-mas'),
      okText: t('learn-more'),
    })) {
      window.open(URL_MAS_LIMITATION)
    }

    throw new Error('Extension requires xterm')
  }
}

async function install (extension?: Extension) {
  if (!extension) {
    return
  }

  await checkRequirements(extension)

  try {
    installing.value = extension.id
    await extensionManager.install(extension, currentRegistry.value)
    await refreshInstalledExtensions()
  } catch (error: any) {
    logger.error('install', error)
    useToast().show('warning', error.message)
    throw error
  } finally {
    installing.value = ''
  }

  useToast().show('info', $t.value('extension.toast-loaded'))
}

async function uninstall (extension?: Extension) {
  if (!extension) {
    return
  }

  logger.debug('uninstall', extension.id)
  if (await useModal().confirm({
    title: $t.value('extension.uninstall'),
    content: $t.value('extension.uninstall-confirm', extension.displayName),
  })) {
    try {
      uninstalling.value = true
      await extensionManager.uninstall(extension)
      await refreshInstalledExtensions()

      if (extension.enabled) {
        dirty.value = true
        useToast().show('warning', $t.value('extension.reload-required'))
      }
    } catch (error: any) {
      logger.error('uninstall', error)
      useToast().show('warning', error.message)
      throw error
    } finally {
      uninstalling.value = false
    }
  }
}

async function upgrade (extension?: Extension) {
  install(extension)
}

function reload () {
  window.location.reload()
}

async function enable (extension?: Extension) {
  if (!extension) {
    return
  }

  await checkOrigin(extension)
  await checkRequirements(extension)

  logger.debug('enable', extension.id)
  await extensionManager.enable(extension)
  refreshInstalledExtensions()
  useToast().show('info', $t.value('extension.toast-loaded'))
}

async function disable (extension?: Extension) {
  if (!extension) {
    return
  }

  logger.debug('disable', extension.id)
  await extensionManager.disable(extension)
  refreshInstalledExtensions()
}

function iframeOnload (e: any) {
  const win = e.target.contentWindow
  win.addEventListener('click', (e: any) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.target.href) {
      window.open(e.target.href)
    }
  }, true)

  const article = win.document.querySelector('article')
  if (article) {
    win.document.body.innerHTML = ''
    win.document.body.appendChild(article)
    win.document.body.style.padding = '12px'
  }

  iframeLoaded.value = true
}

function openUrl (url?: string) {
  if (url) {
    window.open(url, '_blank')
  }
}

watch(extensions, () => {
  if (!currentId.value && extensions.value.length > 0) {
    choose(extensions.value[0].id)
  }
}, { immediate: true })

watch(showManager, (val) => {
  if (val) {
    fetchExtensions()
  } else {
    setTimeout(() => {
      installedExtensions.value = null
      registryExtensions.value = null
      contentMap.value = { readme: {}, changelog: {} }
    }, 400)
  }
})

watch(currentRegistry, (val) => {
  fetchExtensions()
  setting.setSetting('extension.registry', val)
})

watch(currentExtension, (val) => {
  if (val && installedExtensions.value) {
    fetchContent('readme', val)
    fetchContent('changelog', val)
  }
})

onMounted(() => {
  registerAction({ name: 'extension.show-manager', handler: show })
})

onUnmounted(() => {
  removeAction('extension.show-manager')
})
</script>

<style lang="scss" scoped>
.wrapper {
  width: 90vw;
  background: var(--g-color-backdrop);
  backdrop-filter: var(--g-backdrop-filter);
  margin: auto;
  padding: 10px;
  color: var(--g-color-5);
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
  position: relative;

  h3 {
    margin-top: 0;
    margin-bottom: 10px;
  }
}

.body {
  display: flex;
  height: calc(100vh - 7vh - 50px);
  max-height: 900px;
}

.side {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 320px;
  max-width: 30vw;
  flex: none;
}

.list {
  overflow-y: auto;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  font-size: 16px;
  background-color: rgba(var(--g-color-0-rgb), 0.06);

  .item {
    cursor: pointer;
    position: relative;
    border-bottom: 1px var(--g-color-70) solid;
    color: var(--g-color-20);
    display: flex;
    height: 77px;
    padding: 6px;
    box-sizing: border-box;

    .left {
      padding-right: 6px;
      flex: none;
    }

    .right {
      width: 100%;
      overflow: hidden;
      padding-top: 4px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      .status-list {
        display: flex;
        .status {
          font-size: 12px;
          color: var(--g-color-30);
          white-space: nowrap;
          padding-left: 4px;
        }
      }

      .author {
        font-size: 13px;
        color: var(--g-color-30);
        font-weight: bold;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .version {
        font-size: 13px;
        color: var(--g-color-30);
        white-space: nowrap;
      }

      .description {
        font-size: 13px;
        line-height: 1.4;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }
    }

    &:hover {
      background-color: var(--g-color-active-a);
      border-radius: var(--g-border-radius);
    }

    &.selected {
      background-color: var(--g-color-active-a);
      border-radius: var(--g-border-radius);
      color: var(--g-color-0);
    }
  }
}

.tabs {
  display: inline-flex;
  margin-bottom: 8px;
  z-index: 1;
  flex: none;

  ::v-deep(.tab) {
    line-height: 1.5;
    font-size: 14px;
  }
}

.icon-extension {
  background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMiAyMiI+PHBhdGggZD0ibTEzLjU1NSAxMDQzLjgzaC0uOTI3di0yLjQ3M2MwLS42OC0uNTU2LTEuMjM2LTEuMjM2LTEuMjM2aC0yLjQ3MnYtLjkyN2MwLS44NjUtLjY4LTEuNTQ1LTEuNTQ1LTEuNTQ1LS44NjUgMC0xLjU0NS42OC0xLjU0NSAxLjU0NXYuOTI3aC0yLjQ3MmMtLjY4IDAtMS4yMzYuNTU2LTEuMjM2IDEuMjM2djIuMzQ5aC45MjdjLjkyNyAwIDEuNjY5Ljc0MiAxLjY2OSAxLjY2OSAwIC45MjctLjc0MiAxLjY2OS0xLjY2OSAxLjY2OWgtLjkyN3YyLjM0OWMwIC42OC41NTYgMS4yMzYgMS4yMzYgMS4yMzZoMi4zNDl2LS45MjdjMC0uOTI3Ljc0Mi0xLjY2OSAxLjY2OS0xLjY2OS45MjcgMCAxLjY2OS43NDIgMS42NjkgMS42Njl2LjkyN2gyLjM0OWMuNjggMCAxLjIzNi0uNTU2IDEuMjM2LTEuMjM2di0yLjQ3MmguOTI3Yy44NjUgMCAxLjU0NS0uNjggMS41NDUtMS41NDUgMC0uODY1LS42OC0xLjU0NS0xLjU0NS0xLjU0NSIgZmlsbD0iIzg4OCIgdHJhbnNmb3JtPSJtYXRyaXgoMS4yMzI2NSAwIDAgMS4yMzI2NC4zOTctMTI3Ni4wNSkiLz48L3N2Zz4=);
  background-size: 80px 80px;
  background-position: center;
  background-repeat: no-repeat;
  width: 64px;
  height: 64px;
}

.detail {
  width: 100%;
  overflow: hidden;
  padding: 12px;
  padding-right: 0;
  padding-bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .info {
    display: flex;
    flex: none;

    .left {
      flex: none;

      .icon-extension {
        width: 128px;
        height: 128px;
        background-size: 130px 130px;
      }
    }

    .right {
      width: 100%;
      overflow: hidden;
      padding: 12px;

      .title {
        align-items: flex-end;
        justify-content: start;
        overflow: hidden;
        margin-top: -6px;

        .name {
          font-weight: bold;
          font-size: 20px;
          margin-right: 8px;
        }

        .version {
          white-space: nowrap;
          font-size: 14px;
        }
      }

      .tags {
        display: flex;
        flex-wrap: wrap;

        .tag {
          margin: 3px 0;
          border-radius: var(--g-border-radius);
          overflow: hidden;
          background: rgb(80, 80, 80);
          font-size: 12px;
          margin-right: 4px;
          color: #fefefe;

          img {
            display: block;
            height: 100%;
            width: 100%;
          }

          span {
            padding: 4px 6px;
            display: inline-block;

            &:last-child {
              background: rgb(65, 128, 189);
            }
          }
        }
      }

      .description {
        color: var(--g-color-30);
        margin-top: 8px;
        font-size: 15px;
      }

      .actions {
        margin-top: 10px;
        button {
          margin-left: 0;
          margin-right: 6px;
        }

        i {
          font-size: 14px;
        }
      }
    }
  }

  .content-wrapper {
    position: relative;
    height: 100%;
    background: #fff;
    min-height: 0;

    .tabs {
      position: absolute;
      right: 0;
      top: -26px;
    }
  }

  .content {
    height: 100%;
    border-top: 3px solid var(--g-color-86);
    overflow: hidden;
    background: #fff;
  }
}

.title {
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .name {
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--g-color-0);
  }
}

.placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--g-color-60);
}

iframe {
  border: none;
  width: 100%;
  height: 100%;
}

.dialog-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;

  .left {
    display: flex;
    align-items: center;

    select {
      margin-left: 12px;
      padding: 4px;
    }
  }

  .right {
    display: flex;
    justify-content: flex-end;
    align-items: center;

    i {
      margin-right: 6px;
      font-size: 14px;
    }
  }
}

.upgradable {
  color: #4caf50;
}

.warning {
  color: #f44336 !important;
}

.warning-tag {
  background-color: #ff9800 !important;
}
</style>
