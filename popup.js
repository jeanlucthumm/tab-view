document.addEventListener('DOMContentLoaded', main);

class ThumbnailState {
  constructor() {
    // Which thumb is currently highlighted. Default is none
    this.index = -1;
    // List of thumb DOM elements
    this.tList = [];
  }

  // Empty the list and insert 'size' number of boolean value 'false'
  emptyList(size) {
    this.tList = [];
    for (let i = 0; i < size; i++) {
      this.tList.push(false);
    }
  }

  // True if all thumbnails have been created, i.e. no entries in the list
  // are false
  get loaded() {
    let t = true;
    for (let entry of this.tList) {
      if (entry === false) t = false;
    }
    return t;
  }

  get highlightedTab() {
    if (this.index === -1) return null;
    return this.tList[this.index]
  }

  reset() {
    this.index = -1;
    this.tList = [];
  }

  // Highlight functions apply styling iteratively to suggest that a thumb has
  // been selected
  highlightNext() {
    // Un-highlight previous thumb
    if (this.index !== -1) {
      let prev = this.tList[this.index];
      prev.classList.remove('highlight-thumb');
    }
    this.index = (this.index + 1) % this.tList.length;
    let thumb = this.tList[this.index];
    thumb.classList.add('highlight-thumb');
  }

  highlightPrev() {
    // Un-highlight previous thumb
    if (this.index !== -1) {
      let prev = this.tList[this.index];
      prev.classList.remove('highlight-thumb');
    }
    if (this.index === 0) {
      this.index = this.tList.length - 1;
    } else {
      this.index--;
    }
    let thumb = this.tList[this.index];
    thumb.classList.add('highlight-thumb');
  }
}

const tState = new ThumbnailState();

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

    // Update state to reflect number of tabs
    tState.reset();
    tState.emptyList(winTabs.length);

    for (let tab of winTabs) {
      loadThumbnail(tab, template, container, tState);
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
function loadThumbnail(tab, template, container, tState) {
  let key = genThumbDataKey(tab.windowId, tab.id);
  chrome.storage.local.get([key], items => {
    let thumbnail = template.cloneNode(true);
    thumbnail.setAttribute('id', 'thumb' + key);
    thumbnail.setAttribute('tabId', tab.id);
    if (tab.active) thumbnail.setAttribute('active', true);
    tState.tList[tab.index] = thumbnail;

    let hasThumbnail = items.hasOwnProperty(key);

    // Picture
    let pic = thumbnail.getElementsByClassName('pic')[0];
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
    if (tState.loaded) {
      positionThumbnails(container, tState.tList);
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
    window.scrollTo(0, pos - window.innerHeight / 2);
  }
}

// Navigate to the tab whose thumbnail was clicked. First notify the content
// script to delete us from the DOM. The content script will then pass on the
// message to switch tabs to the background script.
function pictureClick() {
  let tabId = parseInt(this.getAttribute('tabId'));
  chrome.tabs.get(tabId, tab => {
    let msg = {cmd: 'tab_switch', windowId: tab.windowId, tabs: [tab.index]};
    window.parent.postMessage(msg, '*');
  });
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
window.onkeydown = ev => {
  if (ev.key === 'Escape') {
    window.parent.postMessage('close', '*');
  } else if (ev.key === 'Tab') {
    if (ev.shiftKey) tState.highlightPrev();
    else tState.highlightNext();
    return false;
  } else if (ev.key === ' ') {
    let thumb = tState.highlightedTab;
    if (thumb === null) return false;
    pictureClick.call(thumb);
  }
};
