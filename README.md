# 🐹 hamsterx

**A tiny, Alpine-like reactive runtime that uses vanilla JS signals and squeaks fast.**

hamsterx takes Alpine's delightful HTML-first syntax and marries it with Solid's signal-based reactivity. The result? A tiny powerhouse that delivers updates so fast they'll make your hamster wheel spin.

> *"Why hamsters? Because they're small, fast, and surprisingly powerful. Also, they fit in your pocket."* 🐹

## Why hamsterx?

✅ **Tiny**: Small enough to fit in a hamster's cheek pouch. It's just ~3KB gzipped (~7KB minified).  
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
import { init, cleanup, createSignal, createEffect } from 'hamsterx';
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
  <button x-on:click="increment()">Add seed to pouches</button>
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

### `x-html`

Reactively updates inner HTML. For when your hamster needs to render rich content (use responsibly - sanitise user input!).

```html
<div x-html="`<strong>${name} is hungry!</strong>`"></div>
```

**⚠️ Security Warning**: Never use `x-html` with unsanitised user input. Your hamster doesn't want XSS vulnerabilities in its cage!

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

Listens to events. Your hamster responds to pokes (gentle ones, we hope). With async support for hamsters who need to wait for things!

```html
<button x-on:click="count++">Click me</button>
<input x-on:input="search = $event.target.value">

<!-- Async event handlers - because sometimes hamsters need to fetch snacks -->
<button x-on:click="await saveData(); showSuccess = true">
  Save to hamster database
</button>

<form 
  x-on:submit="
    $event.preventDefault();
    const result = await fetch('/api/hamster-signup', { 
      method: 'POST', 
      body: JSON.stringify($data) 
    });
    registered = await result.json();
  "
>
  <input x-bind:value="email" x-on:input="email = $event.target.value">
  <button type="submit">Join the hamster club</button>
</form>
```

Special variables:
- `$event` - The native event object
- `$el` - The element itself
- `$data` - All your reactive data

**Pro tip:** Event handlers fully support `await` for async operations. Your hamster can now fetch data, call APIs, and wait for promises without breaking a sweat (or whisker).

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

### `x-init`

Runs initialisation code when your component first loads. Perfect for fetching data, setting up timers, or waking your hamster up in the morning. Fully supports `await` for async operations!

```html
<!-- Simple initialisation -->
<div x-data="{ greeting: '' }" x-init="greeting = 'Hello from hamster HQ! 🐹'">
  <p x-text="greeting"></p>
</div>

<!-- Fetch data on mount - hamsters love fresh data -->
<div 
  x-data="{ hamsters: [], loading: true }"
  x-init="
    hamsters = await (await fetch('/api/hamsters')).json();
    loading = false;
  "
>
  <div x-show="loading">Loading hamster profiles...</div>
  <ul x-show="!loading">
    <template x-for="hamster in hamsters">
      <li x-text="hamster.name"></li>
    </template>
  </ul>
</div>

<!-- Multiple async operations - because hamsters multitask -->
<div 
  x-data="{ user: null, settings: null, ready: false }"
  x-init="
    user = await (await fetch('/api/user')).json();
    settings = await (await fetch('/api/settings')).json();
    ready = true;
    console.log('🐹 Hamster profile loaded!');
  "
>
  <div x-show="ready">
    <h1 x-text="user.name"></h1>
    <p x-text="`Favorite food: ${settings.favoriteSnack}`"></p>
  </div>
</div>
```

**Key points:**
- Runs **once** when the element is initialised (not reactive)
- Runs **after** all other directives are set up (so your bindings are ready)
- Fully supports `await` for fetching data or other async operations
- Access to `$el` and all reactive data via `$data`

**Pro tip:** Use `x-init` for data fetching, third-party library initialisation, or any setup logic your hamster needs before getting to work!

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

### Async Form Submission (Hamsters wait for the server)

```html
<div 
  x-data="{ 
    name: '',
    email: '',
    submitting: false,
    success: false,
    async submit(e) {
      e.preventDefault();
      this.submitting = true;
      const response = await fetch('/api/hamster-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.name, email: this.email })
      });
      this.success = response.ok;
      this.submitting = false;
    }
  }"
>
  <form x-on:submit="await submit($event)">
    <input 
      x-bind:value="name"
      x-on:input="name = $event.target.value"
      placeholder="Hamster name"
    />
    <input 
      x-bind:value="email"
      x-on:input="email = $event.target.value"
      placeholder="hamster@wheel.com"
    />
    <button 
      type="submit"
      x-bind:disabled="submitting"
    >
      <span x-show="!submitting">Join the colony 🐹</span>
      <span x-show="submitting">Scurrying to server...</span>
    </button>
  </form>
  
  <div x-show="success">Welcome to the hamster family!</div>
</div>
```

### Rich Content Rendering (Hamsters love formatted text)

```html
<div 
  x-data="{ 
    content: '<h2>🐹 Hamster Care Guide</h2><p>Feed your hamster <strong>twice daily</strong> with fresh seeds and vegetables.</p>'
  }"
>
  <div x-html="content"></div>
  
  <button x-on:click="content = '<p>Content updated! Your hamster is happy! 😊</p>'">
    Update Guide
  </button>
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

### Data Fetching on Init (Hamsters love fresh data)

```html
<div 
  x-data="{ 
    posts: [],
    loading: true,
    error: null
  }"
  x-init="
    try {
      const response = await fetch('/api/hamster_news?limit=5');
      posts = await response.json();
    } catch (e) {
      error = 'Failed to fetch hamster news 😢';
    } finally {
      loading = false;
    }
  "
>
  <div x-show="loading">🐹 Hamster is fetching data...</div>
  <div x-show="error" x-text="error"></div>
  
  <ul x-show="!loading && !error">
    <template x-for="post in posts">
      <li>
        <h3 x-text="post.title"></h3>
        <p x-text="post.body"></p>
      </li>
    </template>
  </ul>
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

## 🎯 Dynamic Content & Cleanup

Adding hamsters (elements) after page load? Use `init()`. Need to remove them cleanly? Use `cleanup()`:

```javascript
// Adding new content
const div = document.createElement('div');
div.setAttribute('x-data', '{ happy: true }');
document.body.appendChild(div);
hamsterx.init(div);

// Cleaning up before removal (prevents memory leaks!)
hamsterx.cleanup(div);
div.remove();
```

### Why cleanup matters

Your hamster is tidy and doesn't like memory leaks! When you remove elements with `x-data`, always call `cleanup()` first to:
- 🧹 Remove event listeners (no ghost clicks!)
- 🧹 Dispose reactive effects (no phantom updates!)
- 🧹 Free up memory (more room for hamster snacks!)

**Good hamster practices:**

```javascript
// ✅ Clean hamster - proper cleanup
const modal = document.querySelector('#hamster-modal');
hamsterx.cleanup(modal);
modal.remove();

// ✅ Re-initialising? Clean first!
const component = document.querySelector('[x-data]');
hamsterx.cleanup(component);  // Clear old effects
hamsterx.init(component);     // Set up fresh ones

// ❌ Messy hamster - memory leak city!
document.querySelector('#dirty-modal').remove();  // Event listeners still attached! 😱
```

**Note:** `x-for` automatically calls `cleanup()` on its rendered items when the list changes, so you don't need to worry about that. Your hamster has your back! 🐹

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
| hamsterx | ~3KB 🐹 |
| Alpine.js | ~15KB 🏔️ |
| Vue.js | ~40KB 🗻 |
| React | ~45KB 🏔️🏔️ |

*Your hamster is judging your bundle size.*

## ⚠️ Caveats

- Uses `new Function()` and `with` statements for expression evaluation (keep user input sanitised, or your hamster might escape)
- `x-html` can be dangerous with unsanitised user input - your hamster doesn't want XSS in its cage!
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
- [x] `x-init` directive (hook into element initialisation)
- [x] Async/await support in `x-on` and `x-init`
- [x] `x-html` directive (inner HTML binding)
- [x] Proper cleanup system
- [ ] Event modifiers (`.prevent`, `.stop`, `.once`)
- [ ] Benchmarks
- [ ] Even more hamster emojis

## 💭 Philosophy

hamsterx believes in:
- **Simplicity over complexity** - Like a hamster wheel, not a Rube Goldberg machine.
- **HTML-first** - Your markup should read like English, not assembly code.
- **Minimal abstractions** - Signals are simple. Keep it that way.
- **Fast enough** - Your users won't wait for your JavaScript hamster to wake up.
- **Clean cages** - Proper cleanup means no memory leaks. A tidy hamster is a happy hamster!

## 📜 License

MIT - Free as a hamster running in an open field

## 🙏 Credits

Inspired by the brilliant work of:
- [Alpine.js](https://github.com/alpinejs/alpine) by Caleb Porzio
- [Solid.js](https://github.com/solidjs/solid) by Ryan Carniato

Built by [Bobby Donev](https://bobbydonev.com)

---

**Remember**: With great reactivity comes great responsibility. Use your hamster powers wisely. 🐹✨