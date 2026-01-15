import './style.css'
import { setupCounter } from './counter.js'

document.querySelector('#app').innerHTML = `
  <div>
    <h1>Cookie ERP</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Sistema de Gestão ERP para Biscoitos
    </p>
  </div>
`

setupCounter(document.querySelector('#counter'))
