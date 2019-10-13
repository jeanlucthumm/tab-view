document.addEventListener('DOMContentLoaded', main);

function main() {
  setup();

  // Load all tabs in current window.
  chrome.tabs.query({"currentWindow": true}, winTabs => {
    if (winTabs.length === 0) {
      console.error("No tabs in current window");
      return;
    }

    let container = document.getElementById('thumb-container');
    let template = document.getElementById('template');

    // List of all loaded thumbnails by position. Allows us to have access to
    // all thumbnails by position and to check if all are loaded
    let thumbList = [];
    for(let i = 0; i < winTabs.length; i++) {
      thumbList.push(false);
    }

    for (let tab of winTabs) {
      loadThumbnail(tab, template, container, thumbList);
    }
  });

}

function setup() {
  document.getElementById('close-button').onclick = () => {
    window.parent.postMessage('close', '*');
  };
  document.getElementById('scan-button').onclick = () => {
    window.parent.postMessage('scan', '*');
  };
  document.getElementById('help-button').onclick = () => {
    window.parent.postMessage('help', '*');
  };
}

// Loads all thumbnails for tabs given by winTabs.
// winTabs should be the results of a call to chrome.tabs.query. Template will
// be cloned and populated and then appended to container.
function loadThumbnail(tab, template, container, thumbList) {
  let key = genThumbDataKey(tab.windowId, tab.id);
  chrome.storage.local.get([key], items => {
    let thumbnail = template.cloneNode(true);
    thumbnail.setAttribute('id', 'thumb' + key);
    if (tab.active) thumbnail.setAttribute('active', true);
    thumbList[tab.index] = thumbnail;

    let hasThumbnail = items.hasOwnProperty(key);

    // Picture
    let pic = thumbnail.getElementsByClassName('pic')[0];
    pic.setAttribute('window', tab.windowId);
    pic.setAttribute('index', tab.index);
    pic.setAttribute('tabId', tab.id);
    pic.addEventListener('click', pictureClick);
    pic.addEventListener('auxclick', pictureCloseClick);
    if (hasThumbnail) {
      // Display stored screenshot if we have one
      pic.setAttribute('src', items[key]);
    } else {
      // Default image is already set in html
      // Height of default picture must match tab it's representing
      let ratio = 256 / tab.width;
      pic.style.height = (ratio * tab.height).toString() + 'px';
    }

    // Favicon if necessary
    if (tab.favIconUrl && !hasThumbnail) {
      let fav = thumbnail.getElementsByClassName('favicon')[0];
      fav.style.maxWidth = '15%';
      fav.src = tab.favIconUrl;
      fav.onload = () => {
        fav.style.display = 'inline';
        fav.style.marginLeft = (-fav.scrollWidth / 2).toString() + 'px';
        fav.style.marginTop = (-fav.scrollHeight / 2).toString() + 'px';
      }
    }

    // Title
    let title = thumbnail.getElementsByClassName('title')[0];
    if (tab.favIconUrl) {
      let fav = thumbnail.getElementsByClassName('favicon-title')[0];
      fav.src = tab.favIconUrl;
      fav.onload = () => {
        fav.style.display = 'inline';
      }
    }
    if (tab.title) {
      title.textContent = tab.title;
    } else {
      title.textContent = "No Title";
    }

    // Close button
    let close_button = thumbnail.getElementsByClassName('close-button')[0];
    close_button.setAttribute('tabId', tab.id);
    close_button.addEventListener('click', closeClick);

    // Check if we were the last thumbnail to load so that we can start
    // positioning
    let last = true;
    for (entry of thumbList) {
      if (entry === false) last = false;
    }
    if (last) {
      positionThumbnails(container, thumbList);
    }
  })
}

function positionThumbnails(container, thumbList) {
  let activeThumb = undefined;
  for (thumb of thumbList) {
    container.appendChild(thumb);
    if (thumb.hasAttribute('active')) {
      activeThumb = thumb;
    }
  }

  // Scroll to active thumbnail
  if (activeThumb) {
    let rect = activeThumb.getBoundingClientRect();
    let pos = rect.y + rect.height / 2;
    console.log("SCrolling to " + toString(pos - window.innerHeight / 2));
    window.scrollTo(0, pos - window.innerHeight / 2);
  }
}

// Navigate to the tab whose thumbnail was clicked. First notify the content
// script to delete us from the DOM. The content script will then pass on the
// message to switch tabs to the background script.
function pictureClick() {
  let window_num = parseInt(this.getAttribute('window'));
  let index = parseInt(this.getAttribute('index'));
  let msg = {cmd: 'tab_switch', windowId: window_num, tabs: [index]};
  window.parent.postMessage(msg, '*');
}

// Event listener for middle mouse button on image to close tab
function pictureCloseClick(event) {
  if (event.which === 2) {
    let tabId = parseInt(this.getAttribute('tabId'));
    chrome.tabs.remove(tabId);
    this.closest('.thumb').remove();
  }
}

// Called from close button of image. Different than pictureCloseClick()
function closeClick() {
  let tabId = parseInt(this.getAttribute('tabId'));
  chrome.tabs.remove(tabId);
  this.closest('.thumb').remove();
}

// Same event listener exists in content script.
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') {
    window.parent.postMessage('close', '*');
  }
});
