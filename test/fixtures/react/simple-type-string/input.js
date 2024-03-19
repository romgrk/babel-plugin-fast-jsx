import { jsx as _jsx } from "react/jsx-runtime";

const handleRef = ref => { console.log(ref) }

const flat = /*#__PURE__*/_jsx('div', {
  ref: handleRef,
  key: 'container',
  a: 1,
  b: false,
}, 'foo');
