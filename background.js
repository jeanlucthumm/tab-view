
/// Event Handlers

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.clear();
  help();
});

// Remove all thumbnails on start up just in case close tab event didn't
// fire. The only thing in storage is thumbnails.
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.clear();
});

// If tab is navigated to, capture thumbnail
chrome.tabs.onActivated.addListener(activeInfo => {
  captureThumbnail(activeInfo.windowId, activeInfo.tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === 'scan') {
    let tab = sender.tab;

    chrome.tabs.query({'windowId': tab.windowId}, winTabs => {
      if (winTabs.length === 0) {
        console.error("No tabs in window to scan");
        return;
      }
      // Recursively go through all the tabs then reopen modal
      // in the tab scan button was pressed on
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
    help();
  } else if (message.cmd === 'tab_switch') {
    chrome.tabs.highlight({
      windowId: message.windowId,
      tabs: message.tabs
    });
  }

  sendResponse();
});

// Captures the currently visible tab and saves to local storage. windowId
// and tabId refer to the currently visible tab and must be known
// beforehand. Tab is not captured if there is a modal present, in which case
// the function returns false, true otherwise. Callback is always called
// regardless
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

// If current tab updates, capture it again
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  chrome.windows.getCurrent(window => {
    if (tab.active && tab.windowId === window.id
      && changeInfo.status === 'complete') {
      captureThumbnail(tab.windowId, tab.id);
    }
  });
});

// If tab is closed, remove its thumbnail and modal flag
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  let thumb_key = genThumbDataKey(removeInfo.windowId, tabId);
  let flag_key = genModalFlagKey(tabId);
  chrome.storage.local.remove([thumb_key, flag_key]);
});

// Open modal on browser action
chrome.browserAction.onClicked.addListener((tab) => {
  inject();
});

// Open the help page in a new tab
function help() {
  chrome.tabs.create({url: 'install.html'});
}

// Open the TabView modal in the current tab
function inject() {
  // Set flag to indicate modal is open
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

// Highlights every tab in tabs recursively and takes a snapshot.
// The callback is called after the last tab has been captured.
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
