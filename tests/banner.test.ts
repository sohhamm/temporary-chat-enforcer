import {afterEach, beforeEach, describe, expect, it} from 'bun:test'
import {Window} from 'happy-dom'
import {createBanner} from '@/lib/dom/warning'

describe('createBanner', () => {
  let dom: Window

  beforeEach(() => {
    dom = new Window({url: 'https://gemini.google.com/app'})
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.document,
    })
  })

  afterEach(async () => {
    await dom.happyDOM.close()
  })

  it('renders a Shadow DOM chip and invokes onEngage for DOM-only providers', () => {
    let engaged = 0
    const banner = createBanner({
      onEngage: () => {
        engaged += 1
      },
    })

    banner.update({
      kind: 'warning',
      providerId: 'gemini',
      provider: 'Gemini',
      reason: 'This is not a temporary chat on Gemini.',
      canEngage: true,
    })

    const host = dom.document.getElementById('tce-banner-host')
    expect(host).not.toBeNull()
    const shadow = host!.shadowRoot!
    const chip = shadow.querySelector('.chip')
    expect(chip?.getAttribute('data-kind')).toBe('warning')
    expect(chip?.getAttribute('title')).toBe('This is not a temporary chat on Gemini.')

    const engageBtn = shadow.querySelector('.engage')
    expect(engageBtn).not.toBeNull()
    engageBtn!.dispatchEvent(new dom.MouseEvent('click', {bubbles: true}))
    expect(engaged).toBe(1)

    banner.destroy()
    expect(dom.document.getElementById('tce-banner-host')).toBeNull()
  })

  it('dismisses only the dismissed state and invokes onDisableSite from the switch', () => {
    const disabled: string[] = []
    const banner = createBanner({
      onDisableSite: id => {
        disabled.push(id)
      },
    })

    banner.update({kind: 'confirmed', providerId: 'chatgpt', provider: 'ChatGPT'})
    const shadow = dom.document.getElementById('tce-banner-host')!.shadowRoot!

    const switchBtn = shadow.querySelector('.switch')
    expect(switchBtn).not.toBeNull()
    switchBtn!.dispatchEvent(new dom.MouseEvent('click', {bubbles: true}))
    expect(disabled).toEqual(['chatgpt'])

    const closeBtn = shadow.querySelector('.close')
    expect(closeBtn).not.toBeNull()
    closeBtn!.dispatchEvent(new dom.MouseEvent('click', {bubbles: true}))
    expect(shadow.querySelector('.chip')).toBeNull()

    // Same state stays dismissed within session
    banner.update({kind: 'confirmed', providerId: 'chatgpt', provider: 'ChatGPT'})
    expect(shadow.querySelector('.chip')).toBeNull()
    expect(banner.isDismissed()).toBe(true)

    // Restoring brings the dismissed chip back immediately
    banner.restore()
    expect(shadow.querySelector('.chip')).not.toBeNull()
    expect(banner.isDismissed()).toBe(false)

    // Different state still renders
    banner.update({
      kind: 'warning',
      providerId: 'chatgpt',
      provider: 'ChatGPT',
      reason: 'Not temporary',
    })
    expect(shadow.querySelector('.chip')).not.toBeNull()
  })
})
