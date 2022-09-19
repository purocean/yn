<template>
<XMask :show="showPanel" @close="close" style="padding-top: 4em">
  <div class="premium-wrapper" @click.stop>
    <h2>{{$t('premium.premium')}}</h2>
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
    <div v-show="tab === 'buy'" class="buy">
      <div class="step">
        <h4>{{$t('premium.buy.step-1', num.toString())}}</h4>
        <div class="pay-actions">
          <button class="tr"><svg-icon class="pay-icon" name="wechat" /> {{$t('premium.buy.wechat')}}</button>
          <img class="qrcode" src="~@fe/assets/purchase-wechat.jpg" >
          <button class="tr"><svg-icon class="pay-icon" name="alipay" /> {{$t('premium.buy.alipay')}}</button>
          <img class="qrcode" src="~@fe/assets/purchase-alipay.jpg" >
          <button class="tr" @click="paypal"><svg-icon class="pay-icon" name="paypal" /> PayPal</button>
        </div>
      </div>
      <div class="step">
        <h4>{{$t('premium.buy.step-2')}}</h4>
        <div class="pay-actions">
          <button class="tr" @click="sendEmail">{{$t('premium.buy.send-email')}}</button>
          <span class="email-tips">
            {{$t('premium.buy.email-tips')}}
            <a href="javascript:void(0)" @click="showEmailDialog">{{$t('premium.buy.email-failed')}}</a>
          </span>
        </div>
      </div>
      <div class="step">
        <h4>{{$t('premium.buy.step-3')}}</h4>
        <div class="pay-actions">
          <button class="tr" @click="switchTab('activation')">{{$t('premium.activation.activation')}}</button>
        </div>
      </div>
    </div>
    <div class="activation" v-show="tab === 'activation'">
      <div v-if="info">
        <h4>{{$t('premium.activation.info')}}</h4>
        <ul>
          <li>{{$t('premium.activation.name', info.name)}}</li>
          <li>{{$t('premium.activation.email', info.email)}}</li>
          <li>{{$t('premium.activation.hash', info.hash)}}</li>
          <li>{{$t('premium.activation.expires', info.exp)}}</li>
        </ul>
      </div>
      <textarea v-else v-model="license" :placeholder="$t('premium.activation.placeholder')" />
      <div v-if="!info" class="tips">
        {{$t('premium.activation.tips')}}:
        <a href="mailto:yank-note@outlook.com">{{$t('premium.activation.tips-email')}}</a>
        |
        <a href="javascript:void(0)">{{$t('premium.activation.tips-wechat')}}</a>
        <img class="qrcode" src="~@fe/assets/qrcode-wechat.jpg" >
      </div>
    </div>
    <div class="action">
      <button class="btn primary tr" @click="close">{{$t('close')}}</button>
      <button v-if="tab === 'activation' && license.trim()" class="btn tr" @click="activate">{{$t('ok')}}</button>
    </div>
  </div>
</XMask>
</template>

<script lang="ts">
import { debounce, random } from 'lodash-es'
import { computed, defineComponent, onBeforeUnmount, ref } from 'vue'
import { registerAction, removeAction } from '@fe/core/action'
import { useI18n } from '@fe/services/i18n'
import { getLicenseInfo, getPurchased, setLicense } from '@fe/others/premium'
import { useToast } from '@fe/support/ui/toast'
import { dayjs } from '@fe/context/lib'
import { FLAG_DEMO } from '@fe/support/args'
import { useModal } from '@fe/support/ui/modal'
import XMask from './Mask.vue'
import SvgIcon from './SvgIcon.vue'
import GroupTabs from './GroupTabs.vue'

export default defineComponent({
  name: 'premium',
  components: { XMask, SvgIcon, GroupTabs },
  setup () {
    const { t } = useI18n()
    const showPanel = ref(false)
    type Tab = 'intro' | 'buy' | 'activation'
    const tab = ref<Tab>('intro')
    const num = ref(random(100, 999))
    const purchased = ref(getPurchased())
    const license = ref('')
    const info = ref(getLicenseInfo())

    function switchTab (val: Tab) {
      tab.value = val
    }

    function buy () {
      switchTab('buy')
    }

    function showPurchase () {
      showPanel.value = true
      tab.value = 'intro'
      license.value = ''
      purchased.value = getPurchased()
      info.value = getLicenseInfo()
    }

    function close () {
      showPanel.value = false
    }

    function paypal () {
      window.open('https://paypal.me/purocean/6')
    }

    function sendEmail () {
      const subject = t('premium.buy.email.subject')
      const body = t('premium.buy.email.body', num.value.toString(), 'Yank Note Premium')

      const link = document.createElement('a')
      link.href = `mailto:yank-note@outlook.com?Subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      link.target = '_blank'
      link.click()
    }

    async function activate () {
      const val = license.value.trim()
      try {
        useToast().show('info', t('premium.activation.activating'))
        await setLicense(val)
        useToast().show('info', t('premium.activation.success'))
        purchased.value = getPurchased()
        info.value = getLicenseInfo()
        license.value = ''
      } catch (error: any) {
        useToast().show('warning', error.message)
      }
    }

    function showEmailDialog () {
      const body = t('premium.buy.email.body', num.value.toString(), 'Yank Note Premium')

      useModal().input({
        type: 'textarea',
        title: t('premium.buy.email-failed-dialog.title'),
        content: t('premium.buy.email-failed-dialog.content'),
        select: true,
        readonly: true,
        value: body
      })
    }

    const tabs = computed(() => {
      const data: { label: string, value: Tab }[] = [
        { value: 'intro', label: t('premium.intro.intro') },
      ]

      if (!purchased.value) {
        data.push({ value: 'buy', label: t('premium.buy.buy') })
      }

      if (!FLAG_DEMO) {
        data.push({ value: 'activation', label: t('premium.activation.license') })
      }

      return data
    })

    registerAction({ name: 'premium.show', handler: showPurchase })

    onBeforeUnmount(() => {
      removeAction('premium.show')
    })

    return {
      showEmailDialog,
      showPanel,
      tab,
      tabs,
      switchTab,
      paypal,
      sendEmail,
      activate: debounce(activate, 1300, { leading: true, trailing: false }),
      license,
      purchased,
      buy,
      info: computed(() => info.value
        ? { ...info.value, exp: dayjs(info.value?.expires).format('YYYY-MM-DD') }
        : null),
      num,
      close,
    }
  },
})
</script>

<style lang="scss" scoped>
.premium-wrapper {
  width: 480px;
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
  width: 200px;
  position: absolute;
  display: none;
  z-index: 1000;
  margin-top: 10px;
}

.step {
  .pay-icon {
    vertical-align: bottom;
  }

  .pay-actions button:hover + img {
    display: block;
  }

  .email-tips {
    color: var(--g-color-50);
    font-size: 14px;
    margin-left: 1em;

    a {
      color: var(--g-color-50);
    }
  }
}

.activation {
  textarea {
    height: 7em;
  }

  h4 {
    margin: 20px 0;
    margin-bottom: 16px;
  }

  ul {
    padding-left: 0;
    margin: 0;
    list-style: none;

    li {
      line-height: 1.4em;
    }
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
</style>
