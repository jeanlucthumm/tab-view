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
  captureThumbnail(activeInfo.windowId, activeInfo.tabId);
});

// Captures the currently visible tab and saves to local storage. windowId
// and tabId refer to the currently visible tab and must be known
// beforehand. Callback is called immediately after the capture is taken
function captureThumbnail(windowId, tabId, callback) {
  chrome.tabs.captureVisibleTab(
    {format: 'jpeg', quality: 70},
    dataUrl => {
      let key = generateKey(windowId, tabId);
      chrome.storage.local.set({[key]: dataUrl}, () => {
        console.log("Stored data URL with key: " + key); // DEBUG
      });
      if (callback) callback();
    }
  )
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === 'scan') {
    let tab = sender.tab;

    chrome.tabs.query({'windowId': tab.windowId}, winTabs => {
      if (winTabs.length === 0) {
        console.error("No tabs in window to scan");
        return;
      }
      highlightTab(winTabs, () => {
        chrome.tabs.highlight({
          windowId: tab.windowId,
          tabs: [tab.index]
        }, inject);
      });
    });
  }

  sendResponse();
});

chrome.browserAction.onClicked.addListener((tab) => {
  inject();
});

function inject() {
  chrome.tabs.executeScript({file: 'jquery-3.4.1.min.js'});
  chrome.tabs.executeScript({file: 'content.js'});
}

function highlightTab(tabs, callback) {
  if (tabs.length === 0) {
    callback();
    return;
  }
  let tab = tabs[0];
  tabs.shift();
  chrome.tabs.highlight({windowId: tab.windowId, tabs: [tab.index]}, () => {
    captureThumbnail(tab.windowId, tab.id, () => {
      highlightTab(tabs, callback);
    });
  });
}
