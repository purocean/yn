const actions: { [key: string]: any } = {}

export function registerAction (name: string, handler: Function) {
  actions[name] = handler
}

export function getAction (name: string) {
  return actions[name]
}
