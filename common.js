// Generate storage lookup key for thumbnail picture
function genThumbDataKey(windowId, tabId) {
  return windowId.toString() + "#" + tabId.toString();
}

// Generate storage lookup key for modal flag. A stored modal
// flag for a tab indicates that the TabView modal is open in that tab.
function genModalFlagKey(tabId) {
  return "mo#" + tabId;
}
