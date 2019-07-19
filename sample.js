let template = document.getElementById('template');
let container = document.getElementById('thumb-container');


for (let i = 0; i < 10; i++) {
  container.appendChild(template.cloneNode(true));
}