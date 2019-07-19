let div = document.getElementById('thumbnails');

// Loads all thumbnails for tabs given by winTabs.
// winTabs should be the results of a call to chrome.tabs.query.
// thumb_height is the thumbnail display height
function loadThumbnails(winTabs, thumb_height) {
  for (let tab of winTabs) {
    let key = generateKey(tab.windowId, tab.id);
    console.log("Getting for key: " + key); // DEBUG
    chrome.storage.local.get([key], items => {
      // Check that we have a thumbnail
      if (items.hasOwnProperty(key)) {
        let thumbnail = document.createElement("img");
        thumbnail.setAttribute("src", items[key]);
        thumbnail.setAttribute("id", "template" + key);
        thumbnail.setAttribute("height", thumb_height);
        div.appendChild(thumbnail);
      }
      console.log(items);
    })
  }
}

chrome.tabs.query({"currentWindow": true}, winTabs => {
  if (winTabs.length === 0) {
    console.error("No tabs in current window");
    return;
  }

  chrome.storage.sync.get(["thumb_height"], items => {
    if (chrome.runtime.lastError !== undefined) {
      console.error("Failed getting settings for popup display: " +
        chrome.runtime.lastError.message);
    }

    loadThumbnails(winTabs, items["thumb_height"]);
  })
});

