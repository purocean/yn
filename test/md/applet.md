# HTML Applet Test

This document tests the HTML applet feature in Yank Note.

## Basic Applet

```html
<!-- --applet-- Hello Applet -->
<button id="btn" onclick="document.getElementById('output').textContent = 'Hello from Yank Note Applet!'">
  Click Me
</button>
<p id="output" style="color: green; font-weight: bold;"></p>
```

## Counter Applet

```html
<!-- --applet-- Counter -->
<div style="text-align: center; padding: 20px;">
  <h3>Counter: <span id="count">0</span></h3>
  <button onclick="updateCount(1)" style="margin: 5px; padding: 5px 15px;">+1</button>
  <button onclick="updateCount(-1)" style="margin: 5px; padding: 5px 15px;">-1</button>
  <button onclick="updateCount(0)" style="margin: 5px; padding: 5px 15px;">Reset</button>
</div>
<script>
let count = 0;
function updateCount(delta) {
  if (delta === 0) count = 0;
  else count += delta;
  document.getElementById('count').textContent = count;
}
</script>
```

## Color Picker Applet

```html
<!-- --applet-- Color Picker -->
<div style="padding: 10px;">
  <label>Choose a color: </label>
  <input type="color" id="colorInput" value="#5470c6" onchange="updateColor()">
  <div id="colorDisplay" style="width: 100px; height: 100px; margin-top: 10px; background: #5470c6; border-radius: 8px;"></div>
  <p id="colorValue">#5470c6</p>
</div>
<script>
function updateColor() {
  const color = document.getElementById('colorInput').value;
  document.getElementById('colorDisplay').style.background = color;
  document.getElementById('colorValue').textContent = color;
}
</script>
```

## Hash Calculator Applet

```html
<!-- --applet-- Hash Calculator -->
<div style="padding: 10px;">
  <textarea id="hashInput" rows="3" style="width: 100%;" placeholder="Enter text to hash..."></textarea>
  <br>
  <button onclick="calcHash()" style="margin-top: 5px; padding: 5px 15px;">Calculate SHA-256</button>
  <p><strong>Hash:</strong> <code id="hashOutput">-</code></p>
</div>
<script>
async function calcHash() {
  const text = document.getElementById('hashInput').value;
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  document.getElementById('hashOutput').textContent = hashHex;
}
</script>
```

## Notes

- Use `<!-- --applet-- [Title] -->` marker in the first line of an HTML code block
- Applets have access to the `ctx` object for Yank Note API interaction
- Applets run in a sandboxed iframe environment
- Both HTML and JavaScript can be used within applets
