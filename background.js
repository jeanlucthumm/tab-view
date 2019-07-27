chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.clear();
  chrome.storage.sync.set({"thumb_height": 256}, () => {
    if (chrome.runtime.hasOwnProperty("lastError")) {
      console.log("When setting initial sync storage: " +
        chrome.runtime.lastError.message);
    }
  })
});

function saveToStorage(windowId, tabId, dataUrl) {
  let key = generateKey(windowId, tabId);
  chrome.storage.local.set({[key]: dataUrl}, () => {
    console.log("Stored data URL with key: " + key); // DEBUG
  });
}

chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.captureVisibleTab(
    {format: "jpeg", quality: 70},
    dataUrl => {
      saveToStorage(activeInfo.windowId, activeInfo.tabId, dataUrl);
    }
  )
});

chrome.browserAction.onClicked.addListener((tab) => {
  chrome.tabs.executeScript({file: 'jquery-3.4.1.min.js'});
  chrome.tabs.executeScript({file: 'content.js'});
});
