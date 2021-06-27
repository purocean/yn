import mitt, { Emitter, EventType, Handler, WildcardHandler } from 'mitt'

const emitter = mitt()

// debug
// emitter.on('*', (type, payload) => {
//   console.log('debug bus >', type, payload)
// })

interface XEmitter extends Emitter {
  once<T = any>(type: EventType, handler: Handler<T>): void;
  once(type: '*', handler: WildcardHandler): void;
}

(emitter as any).once = (type: any, handler: any) => {
  const wrappedHandler = (evt: any) => {
    handler(evt)
    emitter.off(type, wrappedHandler)
  }
  emitter.on(type, wrappedHandler)
}

export function useBus () {
  return emitter as XEmitter
}

export default function install () {
  (window as any).globalBus = emitter
}
