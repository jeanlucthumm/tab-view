function genThumbDataKey(windowId, tabId) {
  return windowId.toString() + "#" + tabId.toString();
}

function genModalFlagKey(tabId) {
  return "mo#" + tabId;
}
