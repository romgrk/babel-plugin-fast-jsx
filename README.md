# babel-plugin-fast-jsx

> Inline React JSX calls

## Why

JSX in React normally desugars to something like this:

```javascript.jsx
// from this
import { jsx as _jsx } from 'react/jsx-runtime';

function Component({ children }) {
  return (
    <div ref={handleRef} key='component'>
      {children}
    </div>
  )
}

// to this
import { jsx as _jsx } from 'react/jsx-runtime';

function Component({ children }) {
  return /*#__PURE__*/_jsx('div', {
    ref: handleRef,
    key: 'component',
    children: children,
  })
}
```

The problem is that `jsx()` is *slow*, because it needs to clone the props you pass in to extract the `key` and `ref`, and pass them separately to its internal builder function. But is also slow because it needs to handle `defaultProps`, and because it gets passed objects of all forms and shapes, which makes javascript engines *angry*. Angry because they never know which object shape to expect, and it's hard to optimize for them:

![slow function demo](./assets/megamorphic.png)

What this plugin does is to inline all those pesky `jsx()` calls, so you're left with this beauty:

```javascript
// To this
import { jsx as _jsx } from 'react/jsx-runtime';
var __react_CurrentOwner = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
var __react_ElementType = Symbol.for("react.element");

function Component({ children }) {
  return /*#__PURE__*/{
    $$typeof: __react_ElementType,
    type: 'div',
    ref: handleRef,
    key: 'component',
    props: {
      children: children
    },
    _owner: __react_CurrentOwner.current
  })
}
```

No more unnecessary copies, no more looping through `defaultProps`, no more megamorphic object accesses. It's also smart enough to inline `defaultProps` handling where applicable. That means when the component type is not a string like `'div'`, but a function component:

```javascript
Component.defaultProps = { /* ... */ }

// from this
return /*#__PURE__*/_jsx(Component, {
  ref: handleRef,
  key: 'component',
  children: ['text'],
});

// to this
return /*#__PURE__*/{
  $$typeof: __react_ElementType,
  type: Component,
  ref: handleRef,
  key: 'component',
  props: Component.defaultProps ? _extend({}, Component.defaultProps, {
    children: ['text']
  }) : {
    children: ['text']
  },
  _owner: __react_CurrentOwner.current
};
```
## Usage

> [!WARNING]
> This plugin has one subtle difference with regular JSX

The `key` and `ref` props are magic, and only *statically applied* props are extracted. This could cause subtle bugs if you use this non-idiomatic pattern. Note that React is *possibly* also going to make a similar change at the next major version, from [some experimental flags](https://github.com/facebook/react/blob/b09e102ff1e2aaaf5eb6585b04609ac7ff54a5c8/packages/shared/ReactFeatureFlags.js#L186-L188) I could see there.

```javascript
// from this
function Component({ children }) {
  const dynamicProps = { ref: dynamicRef, key: 'dynamic' }
  return (
    <div ref={staticRef} key='static' {...dynamicProps}>
      {children}
    </div>
  )
}

// to this
function Component({ children }) {
  const dynamicProps = { ref: dynamicRef, key: 'dynamic' }
  return ({
    $$typof: REACT_ELEMENT,
    type: 'div',
    key: 'static',
    ref: staticRef,
    props: _extend({}, dynamicProps, { children })
  })
}
```



### Vite

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import babel from 'vite-plugin-babel'

export default defineConfig({
  plugins: [
    react(),
    babel({
      babelConfig: {
        plugins: [
          ['babel-plugin-fast-jsx', {
            useSpread: false,   /* Use `{ ...defaultProps, a: 1, b: 2 }` */
            useBuiltIns: true } /* Use `Object.assign({}, defaultProps, { a: 1, b: 2 })` */
            /* Otherwise, use `_extends({}, defaultProps, { a: 1, b: 2 })` */
          ],
        ]
      }
    })
  ],
})
````
