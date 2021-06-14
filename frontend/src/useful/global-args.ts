export function $args () {
  return new URLSearchParams(location.search)
}

export const FLAG_DISABLE_XTERM = false
export const FLAG_DEMO = process.env.NODE_ENV === 'demo'
