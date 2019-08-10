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
    setup_modal();
  });
  wrapper.appendTo($(document.body));

  // Register event listeners
  window.addEventListener('message', onMessage, false);
}

function setup_modal() {
  let close_button = document.getElementById('tab-view-modal-close-button');
  close_button.onclick = close;
  let scan_button = document.getElementById('tab-view-modal-scan-button');
  scan_button.onclick = scan;


  // Disable scrolling and prevent reflow only if scroll bar was already there
  if (document.body.scrollHeight > window.innerHeight) {
    document.body.classList.add('tab-view-modal-open-disable-scroll-with-bar');
  } else {
    document.body.classList.add('tab-view-modal-open-disable-scroll-no-bar');
  }
}

function scan() {
  close(() => {
    chrome.runtime.sendMessage('scan');
  });
}

function close(callback) {
  let style = document.getElementById('tab-view-stylesheet');
  let wrapper = document.getElementById('tab-view-content-wrapper');
  let container = document.getElementById('tab-view-modal-container');

  // Fade out
  container.style.animation = 'fadeOut 0.3s';
  container.addEventListener('animationend', () => {
    if (style) style.remove();
    if (wrapper) wrapper.remove();
    document.body.classList.remove(
      'tab-view-modal-open-disable-scroll-with-bar',
      'tab-view-modal-open-disable-scroll-no-bar');
    window.content_injected = false;

    chrome.runtime.sendMessage('closed');

    if (callback) callback();
  });
}


function onMessage(event) {
  if (event.data === 'close') {
    close();
  }
}
