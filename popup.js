const container = document.getElementById('thumb-container');
const template = document.getElementById('template');

// Loads all thumbnails for tabs given by winTabs.
// winTabs should be the results of a call to chrome.tabs.query.
// thumb_height is the thumbnail display height
function loadThumbnails(winTabs, thumb_height) {
  for (let tab of winTabs) {
    let key = genThumbDataKey(tab.windowId, tab.id);
    console.log("Getting for key: " + key); // DEBUG
    chrome.storage.local.get([key], items => {
      let thumbnail = template.cloneNode(true);
      thumbnail.setAttribute('id', 'thumb' + key);
      container.appendChild(thumbnail);

      // Picture
      let pic = thumbnail.getElementsByClassName('pic')[0];
      pic.setAttribute('window', tab.windowId);
      pic.setAttribute('index', tab.index);
      pic.addEventListener('click', pictureClick);
      if (items.hasOwnProperty(key)) {
        // Display stored screenshot if we have one
        pic.setAttribute('src', items[key]);
      } else {
        // Height of default picture must match tab it's representing
        let ratio = 256 / tab.width;
        pic.style.height = (ratio * tab.height).toString() + 'px';
      }

      // Title
      let title = thumbnail.getElementsByClassName('title')[0];
      if (tab.title) {
        title.textContent = tab.title;
      } else {
        title.textContent = "No Title";
      }

      // Close button
      let close_button = thumbnail.getElementsByClassName('close-button')[0];
      close_button.setAttribute('tabId', tab.id);
      close_button.addEventListener('click', closeClick);
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

function pictureClick() {
  let window_num = parseInt(this.getAttribute('window'));
  let index = parseInt(this.getAttribute('index'));
  window.parent.postMessage('close', '*'); // close modal after tab switch
  chrome.tabs.highlight({windowId: window_num, tabs: [index]})
}

function closeClick() {
  let tabId = parseInt(this.getAttribute('tabId'));
  chrome.tabs.remove(tabId);
  this.closest('.thumb').remove();
}
