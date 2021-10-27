import type { BuildInEvents } from '@fe/types'
import mitt, { Emitter, WildcardHandler } from 'mitt'

const emitter = mitt()

// debug
// emitter.on('*', (type, payload) => {
//   console.log('debug bus >', type, payload)
// })

export type BuildInEventType = keyof BuildInEvents
export type Handler<T = any> = (event: T) => void;

export type BuildInEventTypeWithoutPayload = { [K in keyof BuildInEvents]: BuildInEvents[K] extends never ? K : never }[keyof BuildInEvents]
export type BuildInEventTypeWithPayload = keyof Omit<BuildInEvents, BuildInEventTypeWithoutPayload>

export interface XEmitter extends Emitter {
  once<T extends BuildInEventType>(type: T, handler: Handler<BuildInEvents[T]>): void;
  once(type: '*', handler: WildcardHandler): void;
  on<T extends BuildInEventType>(type: T, handler: Handler<BuildInEvents[T]>): void;
  on(type: '*', handler: WildcardHandler): void;
  off<T extends BuildInEventType>(type: T, handler: Handler<BuildInEvents[T]>): void;
  off(type: '*', handler: WildcardHandler): void;
  emit<T extends BuildInEventTypeWithPayload>(type: T, event: BuildInEvents[T]): void;
  emit<T extends BuildInEventTypeWithoutPayload>(type: T): void;
  emit(type: '*', event?: any): void;
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
  window.globalBus = emitter
}
