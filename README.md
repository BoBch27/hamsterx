# 🐹 hamsterx

**A tiny, Alpine-like reactive runtime that uses vanilla JS signals and squeaks fast.**

hamsterx takes Alpine's delightful HTML-first syntax and marries it with Solid's signal-based reactivity. The result? A tiny powerhouse that delivers updates so fast they'll make your hamster wheel spin.

> *"Why hamsters? Because they're small, fast, and surprisingly powerful. Also, they fit in your pocket."* 🐹

## Why hamsterx?

✅ **Tiny**: Small enough to fit in a hamster's cheek pouch. It's just ~2.5KB gzipped (~6KB minified).  
✅ **Fast**: Signal-based reactivity means surgical DOM updates, not sledgehammer re-renders.  
✅ **Familiar**: If you know Alpine.js, you already know hamsterx.  
✅ **No Build Step**: Drop it in via CDN and start coding. Your hamster doesn't have time for webpack configs.

## 📌 Installation

### 📦 CDN (Recommended for the Alpine.js vibes)

```html
<script defer src="https://cdn.jsdelivr.net/npm/hamsterx@latest/dist/hamsterx.min.js"></script>
```

The `defer` attribute is optional but recommended for performance - it lets your HTML load first before the hamster starts running.

### 📦 NPM (For the build tool enthusiasts)

```bash
npm install hamsterx
```

```javascript
// Import everything
import hamsterx from 'hamsterx';

// Or import just what you need
import { init, createSignal, createEffect } from 'hamsterx';
```

### ⚙️ Disabling Auto-Init

If you need manual control over initialisation, set this **before** loading hamsterx:

```html
<!-- For CDN -->
<script>window.hamsterxAutoInit = false;</script>
<script defer src="https://cdn.jsdelivr.net/npm/hamsterx@latest/dist/hamsterx.min.js"></script>
<script defer>
  // Now you control when to init
  hamsterx.init();
  console.log('🐹 hamsterx initialised!');
</script>
```

**Note:** When using npm/modules, auto-init only works in browser environments. If you're using a bundler, you'll typically want to call `init()` manually anyway:

```javascript
import hamsterx from 'hamsterx';

// Call init when your app is ready
hamsterx.init();
```

### ⏰ The `hamsterx:ready` Event

When auto-init runs (CDN or browser usage), hamsterx dispatches a `hamsterx:ready` event on the document. This is useful if you need to run code after the library has initialised:

```html
<script>
  document.addEventListener('hamsterx:ready', () => {
    console.log('🐹 hamster is ready to run!');
    // Your initialisation logic here
  });
</script>
<script defer src="https://cdn.jsdelivr.net/npm/hamsterx@latest/dist/hamsterx.min.js"></script>
```

Note that `init()` is synchronous, so you don't need to wait for this event when calling `init()` manually.

## 🚀 Quick Start

```html
<div x-data="{ count: 0 }">
  <button x-on:click="count++">🐹 Feed the hamster</button>
  <p x-text="count"></p>
  <p x-show="count > 5">The hamster is getting chubby!</p>
</div>
```

That's it. No compilation, no virtual DOM, no existential crisis about framework choices.

## 📖 Directives

### `x-data`

Defines reactive data for a component. Think of it as the hamster's data pellets.

```html
<div x-data="{ name: 'Whiskers', age: 2 }">
  <!-- Your component here -->
</div>
```

#### Methods in x-data

You can define methods that access your reactive data using `this`:

```html
<div 
  x-data="{ 
    count: 0,
    increment() {
      this.count++
    },
    reset() {
      this.count = 0
    }
  }"
>
  <button x-on:click="increment()">Add seeds to pouches</button>
  <button x-on:click="reset()">Empty the pouches</button>
  <span x-text="count"></span>
</div>
```

Methods have full access to all reactive data through `this` and can be called from any directive.

### `x-text`

Reactively updates text content. Like a hamster's name tag that magically changes.

```html
<span x-text="name"></span>
```

### `x-show`

Toggles visibility based on a condition. Your hamster appears and disappears (it's not magic, just CSS).

```html
<div x-show="isVisible">🐹 Peek-a-boo!</div>
```

### `x-bind:[attribute]`

Reactively binds attributes. Your hamster's outfit changes with its mood.

```html
<!-- Boolean attributes (hamsters can be disabled too) -->
<button x-bind:disabled="isLoading">Submit</button>
<input x-bind:readonly="!isEditing">

<!-- Dynamic attributes (hamster images are important) -->
<img x-bind:src="hamsterPhotoUrl" x-bind:alt="hamsterName">
<a x-bind:href="hamsterBlogUrl">Read more about hamsters</a>

<!-- Conditional classes (object syntax - the hamster's favorite) -->
<div x-bind:class="{ 'active': isActive, 'sleepy': !isAwake }">
  Hamster status indicator
</div>

<!-- Dynamic styles (because hamsters appreciate good design) -->
<div x-bind:style="{ color: furColor, fontSize: size + 'px' }">
  Color-coordinated hamster
</div>
```

**Class binding** supports object syntax for conditional classes. Your original HTML classes are preserved (hamsters don't forget their roots):

```html
<div class="hamster-card cozy" x-bind:class="{ 'running': isActive, 'napping': isLoading }">
  Base classes stay, dynamic classes toggle like a hamster wheel
</div>
```

### `x-on:[event]`

Listens to events. Your hamster responds to pokes (gentle ones, we hope).

```html
<button x-on:click="count++">Click me</button>
<input x-on:input="search = $event.target.value">
```

Special variables:
- `$event` - The native event object
- `$el` - The element itself
- `$data` - All your reactive data

### `x-for`

Loops through arrays. Like multiple hamsters running on multiple wheels.

```html
<!-- Simple syntax -->
<template x-for="item in items">
  <li x-text="item"></li>
</template>

<!-- With index -->
<template x-for="(item, index) in items">
  <li x-text="`${index}: ${item}`"></li>
</template>
```

## 🎨 Transitions

Make your hamster's entrances and exits graceful! hamsterx supports smooth transitions using `x-transition-enter` and `x-transition-leave` with `x-show`.

### How It Works

When you toggle visibility with `x-show`, hamsterx can apply CSS classes for smooth animations:

```html
<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  .fade-in { animation: fadeIn 300ms ease-out; }
  .fade-out { animation: fadeOut 300ms ease-in; }
</style>

<div x-data="{ visible: false }">
  <button x-on:click="visible = !visible">
    Toggle Hamster Visibility 🐹
  </button>
  
  <div 
    x-show="visible"
    x-transition-enter="fade-in"
    x-transition-leave="fade-out"
  >
    🐹 The hamster appears gracefully and exits with dignity!
  </div>
</div>
```

### With CSS Transitions

You can also use CSS transitions instead of animations:

```html
<style>
  .opacity-enter { 
    opacity: 1; 
    transition: opacity 300ms; 
  }
  .opacity-leave { 
    opacity: 0; 
    transition: opacity 300ms; 
  }
</style>

<div 
  x-show="open"
  x-transition-enter="opacity-enter"
  x-transition-leave="opacity-leave"
>
  Smoothly fading hamster content
</div>
```

### Works With Popular CSS Libraries

hamsterx transitions work perfectly with Tailwind, Animate.css, or any CSS framework:

```html
<!-- Tailwind classes -->
<div 
  x-show="open"
  x-transition-enter="transition ease-out duration-300 opacity-100 scale-100"
  x-transition-leave="transition ease-in duration-200 opacity-0 scale-95"
>
  Tailwind-powered hamster
</div>
```

### Preventing Flash of Content

To prevent elements from briefly appearing before hamsterx loads, use inline styling: `style="display: none;"`:

```html
<div style="display: none;" x-show="open" x-transition-enter="fade-in">
  <!-- Hidden until hamsterx initialises, no flash! -->
  🐹 No premature hamster sightings
</div>
```

hamsterx automatically removes the `display: none` attribute during initialisation, then `x-show` takes over.

**Note:** Transitions work seamlessly with flexbox, grid, and any display type. hamsterx remembers your element's original display value! 🎯

## 💡 Real-World Examples

### Dropdown Menu (Every hamster needs options)

```html
<style>
  @keyframes slideDown {
    from { 
      opacity: 0; 
      transform: translateY(-10px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
  @keyframes slideUp {
    from { 
      opacity: 1; 
      transform: translateY(0); 
    }
    to { 
      opacity: 0; 
      transform: translateY(-10px); 
    }
  }
  .slide-down { animation: slideDown 200ms ease-out; }
  .slide-up { animation: slideUp 150ms ease-in; }
  .dropdown { display: flex; flex-direction: column; }
</style>

<div x-data="{ open: false }">
  <button x-on:click="open = !open">
    🐹 Hamster Menu
  </button>
  
  <div 
    x-show="open"
    x-transition-enter="slide-down"
    x-transition-leave="slide-up"
    class="dropdown"
    style="display: none;"
  >
    <a href="#">Feed hamster</a>
    <a href="#">Pet hamster</a>
    <a href="#">Give hamster a wheel</a>
  </div>
</div>
```

### Form Validation (Even hamsters validate their input)

```html
<div 
  x-data="{ 
    email: '',
    isValid() {
      return this.email.includes('@') && this.email.includes('hamster')
    }
  }"
>
  <input 
    x-bind:value="email"
    x-on:input="email = $event.target.value"
    x-bind:class="{ 'border-red-500': email && !isValid() }"
    class="border"
    placeholder="hamster@wheel.com"
  />
  
  <span x-show="email && !isValid()">Hamsters need valid emails!</span>
</div>
```

### Tab Navigation (Hamsters exploring different tunnels)

```html
<div 
  x-data="{ 
    activeTab: 'home',
    setTab(tab) { this.activeTab = tab }
  }"
>
  <button 
    x-on:click="setTab('home')"
    x-bind:class="{ 'bg-hamster-blue': activeTab === 'home' }"
  >
    🏠 Home Cage
  </button>
  <button 
    x-on:click="setTab('wheel')"
    x-bind:class="{ 'bg-hamster-blue': activeTab === 'wheel' }"
  >
    ⚙️ Exercise Wheel
  </button>
  <button 
    x-on:click="setTab('food')"
    x-bind:class="{ 'bg-hamster-blue': activeTab === 'food' }"
  >
    🥜 Food Stash
  </button>
  
  <div x-show="activeTab === 'home'" x-text="'Welcome to the hamster home!'"></div>
  <div x-show="activeTab === 'wheel'" x-text="'Time to run in circles!'"></div>
  <div x-show="activeTab === 'food'" x-text="'Cheeks full of seeds 🌻'"></div>
</div>
```

## ⚡ Working with Signals (For the nerds)

Under the hood, hamsterx uses signals - a reactive primitive that's simpler than your hamster's exercise routine.

```javascript
import { createSignal, createEffect } from 'hamsterx';

const [count, setCount] = createSignal(0);

createEffect(() => {
  console.log('Count is:', count());
});

setCount(5); // Logs: "Count is: 5"
```

Signals automatically track dependencies and only update what's necessary. It's like your hamster knowing exactly which food pellet changed.

## 🎯 Dynamic Content

Adding hamsters (elements) after page load? Use `initElement()`:

```javascript
const div = document.createElement('div');
div.setAttribute('x-data', '{ happy: true }');
document.body.appendChild(div);
hamsterx.initElement(div);
```

## 💻 Programmatic Access

Need to update data from outside (like reaching into the hamster cage)? Use `getData()`:

```javascript
const el = document.querySelector('[x-data]');
const data = hamsterx.getData(el);
data.count = 42; // Reactively updates! The hamster notices immediately.
```

**Use cases:**
- Integration with third-party libraries (teaching old hamsters new tricks)
- External form handling (hamster data entry)
- Unit testing (making sure your hamster behaves)
- Console debugging (`console.log(hamsterx.getData(el))` - peek at the hamster)

**Example - Plotly chart integration:**

```javascript
const chart = document.getElementById('hamster-activity-chart');
chart.on('plotly_click', (data) => {
  const hamsterData = hamsterx.getData(document.getElementById('stats'));
  hamsterData.selectedDay = data.points[0].x;
  hamsterData.wheelRotations = data.points[0].y;
});
```

## 🌐 Browser Support

Works in all modern browsers (anything that understands `WeakMap`, `Proxy`, and the concept of a hamster).

## 📊 Size Comparison

| Framework | Size (min + gzip) |
|-----------|-------------------|
| hamsterx | ~2.5KB 🐹 |
| Alpine.js | ~15KB 🏔️ |
| Vue.js | ~40KB 🗻 |
| React | ~45KB 🏔️🏔️ |

*Your hamster is judging your bundle size.*

## ⚠️ Caveats

- Uses `new Function()` and `with` statements for expression evaluation (keep user input sanitised, or your hamster might escape)
- No virtual DOM diffing - this is by design for simplicity
- Doesn't include every Alpine.js feature (we're a hamster, not a capybara)

## 🤝 Contributing

Found a bug? Want to add features? Your hamster wheel contributions are welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/faster-hamster`)
3. Commit your changes (`git commit -am 'Make hamster go zoom'`)
4. Push to the branch (`git push origin feature/faster-hamster`)
5. Open a Pull Request

## 🗺️ Roadmap

- [x] Methods in `x-data`
- [x] `x-bind` directive (attribute binding)
- [x] Transition support
- [ ] Event modifiers (`.prevent`, `.stop`, `.once`)
- [ ] `x-init` directive (hook into element initialisation)
- [ ] Benchmarks
- [ ] Even more hamster emojis

## 💭 Philosophy

hamsterx believes in:
- **Simplicity over complexity** - Like a hamster wheel, not a Rube Goldberg machine.
- **HTML-first** - Your markup should read like English, not assembly code.
- **Minimal abstractions** - Signals are simple. Keep it that way.
- **Fast enough** - Your users won't wait for your JavaScript hamster to wake up.

## 📜 License

MIT - Free as a hamster running in an open field

## 🙏 Credits

Inspired by the brilliant work of:
- [Alpine.js](https://github.com/alpinejs/alpine) by Caleb Porzio
- [Solid.js](https://github.com/solidjs/solid) by Ryan Carniato

Built by [Bobby Donev](https://bobbydonev.com)

---

**Remember**: With great reactivity comes great responsibility. Use your hamster powers wisely. 🐹✨