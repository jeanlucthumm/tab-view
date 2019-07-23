function generateKey(windowId, tabId) {
  return windowId.toString() + "#" + tabId.toString();
}

function decodeKey(key) {
  let parts = key.split('#');
  if (parts.length !== 2) {
    console.error("Tried to decode invalid key");
    return;
  }
  return [parseInt(parts[0]), parseInt(parts[1])];
}
