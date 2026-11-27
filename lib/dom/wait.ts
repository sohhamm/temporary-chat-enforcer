export function waitFor(predicate: () => boolean, timeoutMs = 4000): Promise<boolean> {
  if (predicate()) return Promise.resolve(true)

  return new Promise(resolve => {
    let done = false
    const finish = (value: boolean) => {
      if (done) return
      done = true
      observer.disconnect()
      clearInterval(poller)
      clearTimeout(timer)
      resolve(value)
    }

    const check = () => {
      if (predicate()) finish(true)
    }

    const observer = new MutationObserver(check)

    const root = document.documentElement ?? document.body
    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      })
    }

    const poller = setInterval(check, 100)
    const timer = setTimeout(() => finish(predicate()), timeoutMs)
  })
}
