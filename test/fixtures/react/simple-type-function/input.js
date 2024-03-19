import { jsx as _jsx } from "react/jsx-runtime";

const handleRef = ref => { console.log(ref) }

function Component({ children }) {
  return /*#__PURE__*/_jsx('div', {
    ref: handleRef,
    key: 'content',
    children: children,
  })
}

const component = /*#__PURE__*/_jsx(Component, {
  ref: handleRef,
  key: 'component',
  children: ['text'],
});
