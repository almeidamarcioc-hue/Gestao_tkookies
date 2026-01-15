export function setupCounter(element) {
  let count = 0
  const increment = () => {
    count++
    updateDisplay()
  }
  const updateDisplay = () => {
    element.innerText = `count is ${count}`
  }
  element.addEventListener('click', increment)
  updateDisplay()
}
