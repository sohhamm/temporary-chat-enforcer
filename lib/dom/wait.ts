/** Resolve true the first moment `predicate()` is true, or false if `timeoutMs` elapses first. */
export function waitFor(
  predicate: () => boolean,
  timeoutMs = 4000,
): Promise<boolean> {
  if (predicate()) return Promise.resolve(true)

  return new Promise(resolve => {
    let done = false
    const finish = (value: boolean) => {
      if (done) return
      done = true
      observer.disconnect()
      clearTimeout(timer)
      resolve(value)
    }

    const observer = new MutationObserver(() => {
      if (predicate()) finish(true)
    })

    const root = document.documentElement ?? document.body
    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      })
    }

    const timer = setTimeout(() => finish(predicate()), timeoutMs)
  })
}
