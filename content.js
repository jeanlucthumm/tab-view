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

  // Inject the modal
  let wrapper = $('<div>');
  wrapper.attr('id', 'tab-view-content-wrapper');
  wrapper.load(chrome.extension.getURL('modal.html'), () => {
    wrapper.find('#tab-view-iframe')
      .attr('src', chrome.runtime.getURL('popup.html'));

    // TODO the wrapper may not be on the DOM when this runs
    setupModal();
  });
  wrapper.appendTo($(document.body));

  // Register event listeners
  window.addEventListener('message', onMessage, false);
}

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

function scan() {
  close(true, () => {
    chrome.runtime.sendMessage('scan');
  });
}

function close(fast, callback) {
  let container = document.getElementById('tab-view-modal-container');

  // Fade out
  if (!fast) {
    container.style.animation = 'fadeOut 0.3s';
    container.addEventListener('animationend', () => {
      destroyModal(callback);
    });
  } else {
    destroyModal(callback);
  }
}

function destroyModal(callback) {
  let style = document.getElementById('tab-view-stylesheet');
  let wrapper = document.getElementById('tab-view-content-wrapper');

  if (style) style.remove();
  if (wrapper) wrapper.remove();
  document.body.classList.remove(
    'tab-view-modal-open-disable-scroll-with-bar',
    'tab-view-modal-open-disable-scroll-no-bar');
  window.content_injected = false;

  chrome.runtime.sendMessage('closed');

  if (callback) callback();
}

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

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && window.content_injected) {
    // Escape key
    close();
  }
});
