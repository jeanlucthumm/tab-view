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

    setup_modal();
  });
  wrapper.appendTo($(document.body));
}

setup();

function setup_modal() {
  let close_button = document.getElementById('tab-view-modal-close-button');
  close_button.onclick = close;
}

function close() {
  let style = document.getElementById('tab-view-stylesheet');
  let wrapper = document.getElementById('tab-view-content-wrapper');

  style.remove();
  wrapper.remove();
}

window.addEventListener('message', onMessage, false);

function onMessage(event) {
  console.log("From inside" + event.origin); // DEBUG
  console.log(event.data); // DEBUG
}
