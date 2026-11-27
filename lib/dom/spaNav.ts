export function installLocationWatcher(): () => void {
  const origPush = Reflect.get(history, 'pushState') as typeof history.pushState
  const origReplace = Reflect.get(history, 'replaceState') as typeof history.replaceState

  const dispatch = () => window.dispatchEvent(new Event('tce:locationchange'))

  history.pushState = function patchedPushState(...args) {
    const result = origPush.apply(this, args as Parameters<typeof origPush>)
    dispatch()
    return result
  }
  history.replaceState = function patchedReplaceState(...args) {
    const result = origReplace.apply(this, args as Parameters<typeof origReplace>)
    dispatch()
    return result
  }
  window.addEventListener('popstate', dispatch)

  return () => {
    history.pushState = origPush
    history.replaceState = origReplace
    window.removeEventListener('popstate', dispatch)
  }
}

export function onLocationChange(cb: () => void): () => void {
  window.addEventListener('tce:locationchange', cb)
  return () => window.removeEventListener('tce:locationchange', cb)
}
