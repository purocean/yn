<template>
<XMask :show="showPanel" @close="close" style="padding-top: 4em">
  <div class="premium-wrapper" @click.stop>
    <h2>
      {{$t('premium.premium')}}
      <svg v-if="purchased" @click="doConfetti" xmlns="http://www.w3.org/2000/svg" version="1.1" id="Layer_1" viewBox="0 0 512 512" xml:space="preserve">
        <path style="fill:#E65C64;" d="M367.178,314.667h-58.358c-9.223,0-16.697-7.474-16.697-16.697c0-9.223,7.474-16.697,16.697-16.697  h58.358c9.223,0,16.697,7.474,16.697,16.697C383.875,307.194,376.401,314.667,367.178,314.667z"/>
        <path style="fill:#F26D76;" d="M214.366,220.219c-9.223,0-16.697-7.474-16.697-16.697v-58.358c0-9.223,7.474-16.697,16.697-16.697  c9.223,0,16.697,7.474,16.697,16.697v58.358C231.063,212.745,223.589,220.219,214.366,220.219z"/>
        <path style="fill:#FFC033;" d="M241.006,14.693c-19.48-19.591-51.314-19.591-70.794,0c-19.48,19.48-19.48,51.315,0,70.795  c9.461,9.462,22.04,14.693,35.396,14.693s25.937-5.232,35.397-14.693C260.599,66.009,260.599,34.173,241.006,14.693z   M217.459,61.809c-6.78,6.78-17.183,6.508-23.632,0.07c-6.392-6.392-6.392-17.186,0-23.578c6.564-6.59,17.102-6.49,23.502-0.066  C224.127,45.001,223.762,55.546,217.459,61.809z"/>
        <circle style="fill:#43BFBF;" cx="426.886" cy="203.525" r="16.697"/>
        <circle style="fill:#36D9D9;" cx="308.816" cy="85.455" r="16.697"/>
        <circle style="fill:#43BFBF;" cx="426.886" cy="392.424" r="16.697"/>
        <circle style="fill:#36D9D9;" cx="119.918" cy="85.455" r="16.697"/>
        <path style="fill:#FFC033;" d="M443.585,52.059c-9.223,0-16.697-7.474-16.697-16.697V18.665c0-9.223,7.474-16.697,16.697-16.697  c9.223,0,16.697,7.474,16.697,16.697v16.697C460.282,44.585,452.809,52.059,443.585,52.059z"/>
        <path style="fill:#F9A926;" d="M443.585,135.544c-9.223,0-16.697-7.474-16.697-16.697V102.15c0-9.223,7.474-16.697,16.697-16.697  c9.223,0,16.697,7.474,16.697,16.697v16.697C460.282,128.07,452.809,135.544,443.585,135.544z"/>
        <path style="fill:#FFC033;" d="M410.191,85.453h-16.697c-9.223,0-16.697-7.474-16.697-16.697s7.474-16.697,16.697-16.697h16.697  c9.223,0,16.697,7.474,16.697,16.697S419.415,85.453,410.191,85.453z"/>
        <g>
          <path style="fill:#F9A926;" d="M493.676,85.453h-16.697c-9.223,0-16.697-7.474-16.697-16.697s7.474-16.697,16.697-16.697h16.697   c9.218,0,16.697,7.474,16.697,16.697S502.894,85.453,493.676,85.453z"/>
          <path style="fill:#F9A926;" d="M497.027,259.583c-19.48-19.591-51.314-19.591-70.794,0c-19.48,19.48-19.48,51.315,0,70.795   c9.461,9.462,22.04,14.693,35.397,14.693s25.937-5.232,35.397-14.693C516.619,310.898,516.619,279.062,497.027,259.583z    M473.48,306.693c-6.752,6.763-17.152,6.545-23.632,0.076c-6.392-6.392-6.392-17.186,0-23.578c6.564-6.59,17.102-6.49,23.502-0.066   C480.12,289.871,479.812,300.401,473.48,306.693z"/>
        </g>
        <path style="fill:#FFC033;" d="M268.512,260.527c-4.272,0-8.544-1.631-11.805-4.892c-6.522-6.516-6.522-17.093,0-23.611  l104.232-104.232c6.522-6.522,17.089-6.522,23.611,0c6.522,6.516,6.522,17.093,0,23.611L280.318,255.634  C277.056,258.896,272.784,260.527,268.512,260.527z"/>
        <path style="fill:#F9A926;" d="M256.706,255.634c3.261,3.261,7.534,4.892,11.805,4.892c4.271,0,8.544-1.631,11.805-4.892  l104.232-104.232c6.522-6.516,6.522-17.093,0-23.611L256.706,255.634L256.706,255.634z"/>
        <path style="fill:#F26D76;" d="M129.919,426.074v47.141L22.557,511.017c-6.601,2.326-13.068,0.323-17.32-3.907  c-4.286-4.263-6.311-10.764-3.974-17.398L39.11,382.472h47.252l21.739,21.762L129.919,426.074z"/>
        <path style="fill:#E65C64;" d="M129.919,426.074v47.141L22.557,511.017c-6.601,2.326-13.068,0.323-17.32-3.907l102.865-102.876  L129.919,426.074z"/>
        <path style="fill:#F26D76;" d="M82.274,319.365l110.819,110.861h58.73l62.54-22.04c8.706-3.125,13.243-12.584,10.24-21.372  L125.465,187.786c-8.66-3.109-18.251,1.434-21.261,10.13l-21.93,62.132v59.318H82.274z"/>
        <path style="fill:#E65C64;" d="M193.093,430.226h58.73l62.54-22.04c8.706-3.125,13.243-12.584,10.24-21.372l-99.565-99.511  l-87.423,87.423L193.093,430.226z"/>
        <path style="fill:#FFC033;" d="M82.162,260.25L39.086,382.473l90.831,90.72l0.334-0.111l121.776-42.967L82.162,260.25z"/>
        <polygon style="fill:#F9A926;" points="129.917,473.193 130.251,473.082 252.026,430.115 167.127,345.215 84.504,427.836 "/>
        <path style="fill:#36D9D9;" d="M332.436,432.736c-4.272,0-8.544-1.631-11.805-4.892L84.496,191.712  c-6.522-6.516-6.522-17.093,0-23.611c6.522-6.522,17.089-6.522,23.611,0l236.133,236.133c6.522,6.516,6.522,17.093,0,23.611  C340.979,431.105,336.708,432.736,332.436,432.736z"/>
        <path style="fill:#43BFBF;" d="M320.63,427.844c3.261,3.261,7.534,4.892,11.805,4.892s8.544-1.631,11.805-4.892  c6.522-6.516,6.522-17.093,0-23.611L226.174,286.168l-23.611,23.611L320.63,427.844z"/>
      </svg>
    </h2>
    <div class="close-btn" @click="close" :title="$t('close')">
      <svg-icon class="close-btn-icon" name="times" width="10px" />
    </div>
    <group-tabs :tabs="tabs" v-model="tab" />
    <div v-show="tab === 'intro'" class="intro">
      <div v-if="!purchased" class="desc">{{$t('premium.intro.desc')}}</div>
      <div class="plan-wrapper">
        <div class="plan">
          <div class="plan-title">
            <h3>{{$t('premium.free')}}</h3>
            <div class="plan-desc">{{$t('premium.intro.free-desc')}}</div>
          </div>
          <button v-if="purchased" class="buy-btn tr" disabled>{{$t('premium.intro.included')}}</button>
          <button v-else class="buy-btn tr" disabled>{{$t('premium.intro.current-plan')}}</button>
          <ul>
            <li v-for="item in $t('premium.intro.free-list').split('\n')" :key="item">{{item}}</li>
          </ul>
        </div>
        <div class="plan">
          <div class="plan-title">
            <h3>{{$t('premium.premium')}}</h3>
            <div class="plan-desc">{{$t('premium.intro.premium-desc')}}</div>
          </div>
          <button v-if="purchased" class="buy-btn tr" disabled>{{$t('premium.intro.current-plan')}}</button>
          <button v-else class="primary buy-btn tr" @click="buy">{{$t('premium.buy.buy')}}</button>
          <ul>
            <li v-for="item in $t('premium.intro.premium-list').split('\n')" :key="item">{{item}}</li>
          </ul>
        </div>
      </div>
    </div>
    <div class="activation" v-show="tab === 'activation'">
      <template v-if="info">
        <div class="license-id">{{$t('premium.activation.id', info.licenseId)}}</div>
        <div v-if="info.status === 'expired'" class="status-action">
          <span>{{$t('premium.activation.expired')}}</span>
          <button class="small primary" @click="renewal">{{ $t('premium.activation.renewal') }}</button>
          <span v-if="loading" class="loading">Refreshing...</span>
          <button v-else class="small primary" @click="refresh">{{ $t('premium.activation.refresh') }}</button>
        </div>
        <div v-if="tokenIsExpiredSoon(info)" class="status-action">
          <span>{{$t('premium.activation.expiring', String(tokenAvailableDays(info)))}}</span>
          <button class="small primary" @click="renewal">{{ $t('premium.activation.renewal') }}</button>
          <span v-if="loading" class="loading">Refreshing...</span>
          <button v-else class="small primary" @click="refresh">{{ $t('premium.activation.refresh') }}</button>
        </div>
        <div v-if="info.status === 'stale'" class="status-action">
          <span>{{$t('premium.activation.need-refresh')}}</span>
          <span v-if="loading" class="loading">Refreshing...</span>
          <button v-else class="small primary" @click="refresh">{{ $t('premium.activation.refresh') }}</button>
        </div>
        <div>
          <div>
            <h4>{{$t('premium.activation.info')}}</h4>
            <ul>
              <li>{{$t('premium.activation.name', info.name)}}</li>
              <li>{{$t('premium.activation.email', info.email)}}</li>
              <li>{{$t('premium.activation.plan', info.displayName)}}</li>
              <li>{{$t('premium.activation.expires', info.expires.toLocaleDateString())}}</li>
            </ul>
          </div>
          <div>
            <h4>{{$t('premium.activation.devices')}} ({{devices.length}})</h4>
            <ol>
              <li v-for="device in devices" :key="device.id">
                <span>{{device.label}}</span>
                <a href="javascript:void(0)" @click="removeDevice(device)">{{$t('premium.activation.unbind')}}</a>
              </li>
            </ol>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="code-label">
          {{ $t('premium.activation.placeholder') }}
          <a href="javascript: void(0)" @click="buy">{{ $t('premium.activation.get-license') }}</a>
        </div>
        <input v-model="license" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" maxlength="36" />
      </template>
      <div v-if="!info" class="tips">
        {{$t('premium.activation.tips')}}:&nbsp;
        <a href="mailto:yank-note@outlook.com">yank-note@outlook.com</a>
        &nbsp; | &nbsp;
        <a href="javascript:void(0)">{{$t('premium.activation.tips-wechat')}}</a>
        <img class="qrcode" src="~@fe/assets/qrcode-wechat.jpg" >
      </div>
    </div>
    <div v-if="tab === 'activation' && !info" class="action">
      <button class="btn tr" :disabled="license.trim().length < 36 || loading" @click="activate">{{$t('ok')}}</button>
    </div>
  </div>
</XMask>
</template>

<script lang="ts">
import confetti from 'canvas-confetti'
import { debounce, random } from 'lodash-es'
import { decodeDevice, LicenseToken } from 'app-license'
import { computed, defineComponent, onBeforeUnmount, ref, shallowRef } from 'vue'
import { registerAction, removeAction } from '@fe/core/action'
import { useI18n } from '@fe/services/i18n'
import { activateLicense, getLicenseToken, getPurchased, refreshLicense, requestApi, tokenAvailableDays, tokenIsExpiredSoon } from '@fe/others/premium'
import { useToast } from '@fe/support/ui/toast'
import { FLAG_DEMO } from '@fe/support/args'
import { useModal } from '@fe/support/ui/modal'
import { openWindow } from '@fe/support/env'
import type { PremiumTab } from '@fe/types'
import XMask from './Mask.vue'
import SvgIcon from './SvgIcon.vue'
import GroupTabs from './GroupTabs.vue'

const GET_LICENSE_URL = 'https://yank-note.com/pricing'
const RENEWAL_LICENSE_URL = 'https://yank-note.com/renewal'

export default defineComponent({
  name: 'premium',
  components: { XMask, SvgIcon, GroupTabs },
  setup () {
    const { t } = useI18n()
    const showPanel = ref(false)
    const tab = ref<PremiumTab>('intro')
    const num = ref(random(100, 999))
    const purchased = ref(getPurchased())
    const license = ref('')
    const info = shallowRef<(LicenseToken & { devices: string[] }) | null>(null)
    const loading = ref(false)

    type XDevice = { label: string, id: string, isCurrent: boolean }
    const devices = shallowRef<XDevice[]>([])

    async function refreshStatus () {
      license.value = ''
      purchased.value = getPurchased()
      await fetchLicenseInfo()
    }

    async function fetchLicenseInfo () {
      const token: any = getLicenseToken()
      if (!token) {
        info.value = null
        devices.value = []
        return null
      }

      info.value = token

      const data: string[] = await requestApi('fetchDevices', { licenseId: token.licenseId }).catch(() => [])

      if (data.length === 0) {
        data.push(token.device)
      }

      devices.value = data.map(x => {
        const item = decodeDevice(x)
        const isCurrent = token.device === x
        return {
          isCurrent,
          label: `[${item.platform}] ${item.hostname} ` +
            (isCurrent ? `(${t('premium.activation.this-machine')})` : ''),
          id: x,
        }
      })
    }

    async function removeDevice (device: XDevice) {
      if (await useModal().confirm({
        title: t('premium.activation.unbind'),
        content: t('premium.activation.unbind-confirm', device.label),
      })) {
        if (info.value) {
          try {
            await requestApi('removeDevice', { licenseId: info.value.licenseId, device: device.id })
          } catch (error) {
            useToast().show('warning', String(error))
            throw error
          }

          await refreshLicense()
          refreshStatus()
        }
      }
    }

    function switchTab (val: PremiumTab) {
      tab.value = val
    }

    function buy () {
      openWindow(GET_LICENSE_URL)
      tab.value = 'activation'
    }

    async function showPurchase (_tab?: PremiumTab) {
      showPanel.value = true
      tab.value = _tab || 'intro'
      refreshStatus()
      refreshLicense()
    }

    function close () {
      showPanel.value = false
    }

    function doConfetti () {
      if (purchased.value) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: Number.MAX_SAFE_INTEGER,
        })
      }
    }

    async function activate () {
      const val = license.value.trim()
      try {
        loading.value = true
        useToast().show('info', t('premium.activation.activating'))
        await activateLicense(val)
        useToast().show('info', t('premium.activation.success'))
        refreshStatus()

        doConfetti()
      } catch (error: any) {
        useToast().show('warning', error.message)
      } finally {
        loading.value = false
      }
    }

    const tabs = computed(() => {
      const data: { label: string, value: PremiumTab }[] = [
        { value: 'intro', label: t('premium.intro.intro') },
      ]

      if (!FLAG_DEMO) {
        data.push({ value: 'activation', label: t('premium.activation.license') })
      }

      return data
    })

    async function refresh () {
      try {
        loading.value = true
        await refreshLicense({ throwError: true }).catch(err => {
          useToast().show('warning', err.message)
        })
        await refreshStatus()
      } finally {
        loading.value = false
      }
    }

    function renewal () {
      openWindow(RENEWAL_LICENSE_URL + '?uuid=' + info.value?.licenseId)
    }

    refreshStatus()

    registerAction({ name: 'premium.show', handler: showPurchase })

    onBeforeUnmount(() => {
      removeAction('premium.show')
    })

    return {
      loading,
      showPanel,
      tab,
      tabs,
      switchTab,
      activate: debounce(activate, 1300, { leading: true, trailing: false }),
      refresh: debounce(refresh, 1300, { leading: true, trailing: false }),
      license,
      purchased,
      buy,
      info,
      devices,
      num,
      close,
      removeDevice,
      doConfetti,
      tokenAvailableDays,
      tokenIsExpiredSoon,
      refreshStatus,
      renewal,
    }
  },
})
</script>

<style lang="scss" scoped>
.premium-wrapper {
  width: 600px;
  background: var(--g-color-backdrop);
  backdrop-filter: var(--g-backdrop-filter);
  margin: auto;
  padding: 20px;
  padding-top: 10px;
  color: var(--g-color-5);
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);

  h2 {
    margin-top: 10px;
    display: flex;
    align-items: center;

    svg {
      cursor: pointer;
      margin-left: 4px;
      border-radius: 4px;
      width: 22px;
      height: 22px;
      &:hover {
        background-color: var(--g-color-75);
      }
    }
  }

  h3 {
    margin-top: 0;
  }

  .desc {
    font-size: 14px;
    color: var(--g-color-20);
    line-height: 1.4;
  }
}

.action {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}

.plan-wrapper {
  display: flex;
  margin-top: 20px;

  .plan {
    width: 50%;

    .plan-title {
      display: flex;
      align-items: center;

      h3 {
        margin: 0;
      }

      .plan-desc {
        color: var(--g-color-50);
        font-size: 14px;
        margin-left: 8px;
      }
    }

    ul {
      padding-left: 20px;
      margin: 0;
      list-style-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgLTIgMTQgMTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZD0iTTEuMTg3NSA1LjMxMjQ1TDQuNjg3NSA4LjgxMjQ1TDEyLjU2MjUgMC45Mzc0NTQiIHN0cm9rZT0iIzE1QzM5QSIgc3Ryb2tlLXdpZHRoPSIxLjc1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+Cg==);

      li {
        line-height: 1.5;
      }
    }
  }

  .buy-btn {
    width: 80%;
    margin: 16px 0;
  }
}

.qrcode {
  max-width: 200px;
  width: 34vh;
  position: absolute;
  display: none;
  z-index: 1000;
  margin-top: 6px;
}

.activation {
  .code-label {
    font-size: 13px;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
  }

  .license-id {
    color: var(--g-color-15);
    margin-bottom: 20px;
    margin-top: 10px;
  }

  & > div {
    display: flex;

    & > div {
      width: 50%;
      flex: none;
    }
  }

  h4 {
    margin: 20px 0;
    margin-top: 0;
    margin-bottom: 16px;
  }

  ol {
    padding-left: 18px;
  }

  ul {
    padding-left: 0;
    margin: 0;
    list-style: none;
  }

  li {
    line-height: 1.4em;
  }

  .tips {
    margin: 20px 0;
    color: var(--g-color-50);
    font-size: 14px;

    a {
      color: var(--g-color-50);

      &:hover + img {
        width: 200px;
        margin-top: -220px;
        margin-left: 220px;
        display: block;
      }
    }
  }
}

.intro,
.buy,
.activation {
  max-height: calc(100vh - 14em);
  overflow-y: auto;
}

.close-btn {
  position: absolute;
  right: 8px;
  top: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--g-color-15);

  &:hover {
    color: var(--g-color-0);
    background-color: var(--g-color-86);
    border-radius: 50%;
  }
}

.status-action {
  margin-bottom: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--g-color-50);
  display: flex;
  align-items: center;

  span {
    color: #f44336;
    font-style: italic;
    font-size: 14px;
    margin-right: 8px;
  }

  .loading {
    margin-left: 8px;
    color: var(--g-color-40);
  }
}
</style>
