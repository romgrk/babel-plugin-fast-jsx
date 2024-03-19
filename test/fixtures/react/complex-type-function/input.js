import { jsx as _jsx } from "react/jsx-runtime";

const handleRef = ref => { console.log(ref) }
function Component() { return null }
const otherProps = {}

// safe to remove
const refLast = _jsx(Component, _extends({
  className: 'cell',
}, otherProps, {
  ref: handleRef,
}));

// ref = otherProps.ref ?? handleRef
const refFirst = _jsx(Component, _extends({
  ref: handleRef,
}, otherProps, {
  className: 'cell',
}));
