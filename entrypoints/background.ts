export default defineBackground(() => {
  // Background service worker. Currently a no-op: all enforcement runs in the content script
  // and the popup talks to chrome.storage.sync directly. Reserved for future cross-tab signaling.
})
