import type { Plugin } from '@fe/context'

export default {
  name: 'drop-to-open-file',
  register: (ctx) => {
    // only support electron
    if (!ctx.env.isElectron) {
      return
    }

    const dragClassName = 'file-dragover'
    let isDrag = true

    function isDragFile (e: DragEvent) {
      return e.dataTransfer?.items &&
        e.dataTransfer.items.length > 0 &&
        e.dataTransfer.items[0].kind === 'file'
    }

    function enableDropStyle (e: DragEvent) {
      if (isDragFile(e)) {
        isDrag = true
        e.stopPropagation()
        e.preventDefault()
        window.document.body.classList.add(dragClassName)
      }
    }

    function onDrop (e: DragEvent) {
      disableDropStyle()

      if (isDragFile(e)) {
        const item = e.dataTransfer?.items?.[0]
        // if drag image file, do nothing. let editor handle it
        if (item && !item.type.toLowerCase().startsWith('image')) {
          const path = item?.getAsFile()?.path
          if (path) {
            e.stopPropagation()
            e.preventDefault()
            ctx.doc.switchDocByPath(path)
          }
        }
      }
    }

    async function disableDropStyle () {
      isDrag = false
      await ctx.utils.sleep(50)
      if (!isDrag) {
        window.document.body.classList.remove(dragClassName)
      }
    }

    function listenEvent (win: Window) {
      win.addEventListener('dragover', enableDropStyle, true)
      win.addEventListener('dragenter', enableDropStyle, true)
      win.addEventListener('dragend', disableDropStyle, true)
      win.addEventListener('dragleave', disableDropStyle, true)
      win.addEventListener('drop', onDrop, true)
    }

    listenEvent(window)
    ctx.view.getRenderIframe().then((iframe) => {
      listenEvent(iframe.contentWindow!)
    })

    ctx.theme.addStyles(`
      body.${dragClassName}::after {
        content: '';
        position: fixed;
        pointer-events: none;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.2);
        z-index: 99999999;
      }
    `)
  }
} as Plugin
