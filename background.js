chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.clear();
  chrome.storage.sync.set({"thumb_height": 256}, () => {
    if (chrome.runtime.hasOwnProperty("lastError")) {
      console.log("When setting initial sync storage: " +
        chrome.runtime.lastError.message);
    }
  });
});

// Remove all thumbnails on start up just in case close tab event didn't
// fire. The only thing in storage is thumbnails.
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.clear();
});

chrome.tabs.onActivated.addListener(activeInfo => {
  captureThumbnail(activeInfo.windowId, activeInfo.tabId);
});

// Captures the currently visible tab and saves to local storage. windowId
// and tabId refer to the currently visible tab and must be known
// beforehand. Callback is called immediately after the capture is taken.
// Returns true if the capture is taken, false otherwise.
function captureThumbnail(windowId, tabId, callback) {
  // If flag is set then modal is open and we don't capture
  let key = genModalFlagKey(tabId);
  chrome.storage.local.get(key, items => {
    if (items.hasOwnProperty(key)) {
      if (callback) callback();
      return false;
    }

    chrome.tabs.captureVisibleTab(
      {format: 'jpeg', quality: 70},
      dataUrl => {
        let key = genThumbDataKey(windowId, tabId);
        chrome.storage.local.set({[key]: dataUrl}, () => {
        });
        if (callback) callback();
      }
    );
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  chrome.windows.getCurrent(window => {
    if (tab.active && tab.windowId === window.id
      && changeInfo.status === 'complete') {
      captureThumbnail(tab.windowId, tab.id);
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  let key = genThumbDataKey(removeInfo.windowId, tabId);
  chrome.storage.local.remove(key);
});

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
  } else if (message === 'closed') {
    let key = genModalFlagKey(sender.tab.id);
    chrome.storage.local.remove(key);
  } else if (message === 'help') {
    onHelp();
  } else if (message.cmd === 'tab_switch') {
    chrome.tabs.highlight({
      windowId: message.windowId,
      tabs: message.tabs
    });
  }

  sendResponse();
});

function onHelp() {
  chrome.tabs.create({url: 'install.html'});
}

chrome.browserAction.onClicked.addListener((tab) => {
  inject();
});

function inject() {
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    if (tabs.length === 0) return;
    let key = genModalFlagKey(tabs[0].id);
    chrome.storage.local.set({[key]: true});
    console.log("set modal flag for key: " + key);
  });
  chrome.tabs.executeScript({file: 'jquery-3.4.1.min.js'});
  chrome.tabs.executeScript({file: 'common.js'});
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
