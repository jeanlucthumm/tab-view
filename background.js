/// Event Handlers

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.clear();
  help();
});

// Remove all thumbnails on start up just in case close tab event didn't
// fire.
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.clear();
});

chrome.windows.onRemoved.addListener(windowId => {
  chrome.storage.local.remove(genWindowLastTabKey(windowId));
})

chrome.tabs.onActivated.addListener(activeInfo => {
  captureThumbnail(activeInfo.windowId, activeInfo.tabId);
  updateLastTab(activeInfo.windowId, activeInfo.tabId);
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
    closeBackupIfOpen();
  } else if (message === 'help') {
    help();
    closeBackupIfOpen();
  } else if (message.cmd === 'tab_switch') {
    chrome.tabs.highlight({
      windowId: message.windowId,
      tabs: message.tabs
    });
    closeBackupIfOpen();
  }

  sendResponse();
});

// Update the current and last tab variables. Old current becomes
// new last
function updateLastTab(windowId, currentTabId) {
  let winKey = genWindowLastTabKey(windowId);
  // Backup tabs are never considered
  chrome.storage.local.get('backup_id', items => {
    if (items.hasOwnProperty('backup_id') && items.backup_id === currentTabId) {
      return;
    }

    chrome.storage.local.get(winKey, items => {
      if (!items.hasOwnProperty(winKey)) {
        chrome.storage.local.set({
          [winKey]: {
            current: currentTabId.tabId,
            last: null
          }
        });
        return;
      }

      let data = items[winKey];
      data.last = data.current;
      data.current = currentTabId;
      chrome.storage.local.set({[winKey]: data});
    });
  });
}

// Checks if the back up is open by looking up the special flag in storage,
// then closes it if needed
function closeBackupIfOpen() {
  chrome.storage.local.get("backup_id", items => {
    if (!items.hasOwnProperty("backup_id")) return;
    chrome.tabs.remove(items.backup_id);
    chrome.storage.local.remove("backup_id", () => {
      err("remove backup id", chrome.runtime.lastError);
    });
  });
}

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
      // FIXME maybe you should capture regardless
      return;
    }

    chrome.tabs.captureVisibleTab(
      {format: 'jpeg', quality: 70},
      dataUrl => {
        if (chrome.runtime.lastError) {
          if (callback) callback();
          return;
        }
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

// Remove a tab's thumbnail and modal flag from storage
function removeTab(windowId, tabId) {
  let thumb_key = genThumbDataKey(windowId, tabId);
  let flag_key = genModalFlagKey(tabId);
  chrome.storage.local.remove([thumb_key, flag_key]);
}

// If tab is closed or detached, remove it from storage
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  removeTab(removeInfo.windowId, tabId);
});
chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  removeTab(detachInfo.oldWindowId, tabId);
});

// Recapture the attached tab since it most likely changed sizes
chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  // Ensure that the newly attached tab and its window are focused
  chrome.windows.get(attachInfo.newWindowId, window => {
    if (!window.focused) return;
    chrome.tabs.get(tabId, tab => {
      if (!tab.active) return;
      captureThumbnail(window.id, tab.id);
    })
  });
});

// Open modal on browser action
chrome.browserAction.onClicked.addListener((tab) => {
  inject();
});

// Open the help page in a new tab
function help() {
  chrome.tabs.create({url: 'install.html'});
}

// Displayed the first time the backup_tab page is opened
const failedInjectMessage =
  "TabView DOES NOT usually open in a new tab! This happens on " +
  "a few specific pages including the one that you were on. " +
  "Check out the help page for more info.";

// Open the TabView modal in the current tab
function inject() {
  // Set flag to indicate modal is open
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    if (tabs.length === 0) return;
    let key = genModalFlagKey(tabs[0].id);
    chrome.storage.local.set({[key]: true});
  });
  chrome.tabs.executeScript({file: 'jquery-3.4.1.min.js'}, () => {
    if (chrome.runtime.lastError) {
      openBackupTab();
      return;
    }
    chrome.tabs.executeScript({file: 'common.js'}, () => {
      let err = chrome.runtime.lastError;
      if (err) console.error('Failed to inject common.js: ' + err)
      chrome.tabs.executeScript({file: 'content.js'}, () => {
        let err = chrome.runtime.lastError;
        if (err) console.error('Failed to inject content.js: ' + err)
      });
    });
  });
}

// Opens the fallback tab which provides a page TabView is open in. This
// happens on pages where the content script cannot be injected.
function openBackupTab() {
  chrome.tabs.create({
    url: 'backup_tab.html',
    active: true
  }, (tab) => {
    if (err("create backup tab", chrome.runtime.lastError)) return;

    // Only display alert once
    chrome.storage.local.get("backup_alerted", items => {
      if (err("get backup alerted key", chrome.runtime.lastError)) return;
      if (items.hasOwnProperty("backup_alerted")) return;

      alert(failedInjectMessage);
      chrome.storage.local.set({"backup_alerted": true}, () => {
        err("set backup alerted key", chrome.runtime.lastError);
      });
    });

    // Store the tab ID so we recognize it and close it when the user selects
    // a thumb
    chrome.storage.local.set({"backup_id": tab.id}, () => {
      err("set backup tab id", chrome.runtime.lastError);
    });
  });
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
