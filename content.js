// Inject the CSS
let style = document.createElement('link');
style.rel = 'stylesheet';
style.type = 'text/css';
style.href = chrome.extension.getURL('content.css');
(document.head || document.documentElement).appendChild(style);

let wrapper = $('<div>');
wrapper.attr('id', 'tab-view-content-wrapper');
wrapper.load(chrome.extension.getURL('modal.html'), () => {
  wrapper.find('#tab-view-iframe')
    .attr('src', chrome.runtime.getURL('popup.html'));
});

wrapper.appendTo($(document.body));

