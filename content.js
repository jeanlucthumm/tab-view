// Prevent multiple injections
if (!window.content_injected) {
  window.content_injected = true;
  setup();
}

function setup() {
  // Inject the CSS
  let style = document.createElement('link');
  style.id = 'tab-view-stylesheet';
  style.rel = 'stylesheet';
  style.type = 'text/css';
  style.href = chrome.extension.getURL('content.css');
  (document.head || document.documentElement).appendChild(style);

  window.addEventListener('message', onMessage, false);

  // Inject the modal
  let wrapper = $('<div>');
  wrapper.attr('id', 'tab-view-content-wrapper');
  wrapper.load(chrome.extension.getURL('modal.html'), () => {
    wrapper.find('#tab-view-iframe')
      .attr('src', chrome.runtime.getURL('popup.html'));
    wrapper.appendTo($(document.body));

    setupModal();
  });
}

// Registers event listeners and does some CSS magic after the modal
// has been injected
function setupModal() {
  document.getElementById('tab-view-modal-scan-button').onclick = scan;
  document.getElementById('tab-view-modal-help-button').onclick = help;
  document.getElementById('tab-view-modal-close-button').onclick = () => {
    close(false);
  };


  // Disable scrolling and prevent reflow only if scroll bar was already there
  if (document.body.scrollHeight > window.innerHeight) {
    document.body.classList.add('tab-view-modal-open-disable-scroll-with-bar');
  } else {
    document.body.classList.add('tab-view-modal-open-disable-scroll-no-bar');
  }
}

// Called from scan button. Goes through all tabs and captures thumbnail
function scan() {
  close(true, () => {
    chrome.runtime.sendMessage('scan');
  });
}

// Closes the modal. 'fast' is optional and if true will skip fade out
// closing animation. 'callback' is optional and is called the moment
// the modal has been removed from the DOM.
function close(fast, callback) {
  let container = document.getElementById('tab-view-modal-container');

  // Fade out
  if (fast === true) {
    destroyModal(callback);
  } else {
    container.style.animation = 'fadeOut 0.3s';
    container.addEventListener('animationend', () => {
      destroyModal(callback);
    });
  }
}

// Removes the modal from the DOM and calls the optional callback.
// Prefer calling close() unless there's a good reason to call this.
function destroyModal(callback) {
  let style = document.getElementById('tab-view-stylesheet');
  let wrapper = document.getElementById('tab-view-content-wrapper');

  // Need to guarantee that the wrapper remove has been rendered
  // before declaring modal closed and calling callback
  window.requestAnimationFrame(() => {
    setTimeout(() => {

      if (style) style.remove();
      document.body.classList.remove(
        'tab-view-modal-open-disable-scroll-with-bar',
        'tab-view-modal-open-disable-scroll-no-bar');
      chrome.runtime.sendMessage('closed');
      window.content_injected = false;

      if (callback) callback();
    })
  });
  if (wrapper) wrapper.remove();
}

// Called from help button. Opens install page
function help() {
  close(true, () => {
    chrome.runtime.sendMessage('help');
  });
}

function onMessage(event) {
  if (event.data === 'close' && window.content_injected) {
    close();
  } else if (event.data.cmd === 'tab_switch') {
    let msg = {
      cmd: 'tab_switch',
      windowId: event.data.windowId,
      tabs: event.data.tabs
    };
    close(true, () => {
      chrome.runtime.sendMessage(msg);
    })
  }
}

// There is another event listener for the modal iframe doing
// the same thing.
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && window.content_injected) {
    // Escape key
    close();
  }
});
