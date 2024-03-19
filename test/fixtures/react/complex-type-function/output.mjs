import { jsx as _jsx } from "react/jsx-runtime";
import * as __react from "react";
var __react_CurrentOwner = __react.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
var __react_ElementType = Symbol.for("react.element");
function _jsxFromOwnedExtends() {
  // type, maybeKey, ownedProps, ...props
  var type = arguments[0];
  var props = arguments[2];
  var key = arguments[1] != null ? arguments[1] : props.key;
  var ref = null;
  var defaultProps = type.defaultProps;
  if (defaultProps) {
    for (var field in defaultProps) {
      if (Object.prototype.hasOwnProperty.call(defaultProps, field)) {
        props[field] = defaultProps[field];
      }
    }
  }
  for (var i = 3; i < arguments.length; i++) {
    var other = arguments[i];
    for (var field in other) {
      if (Object.prototype.hasOwnProperty.call(other, field)) {
        props[field] = other[field];
      }
    }
  }
  key = 'key' in props ? props.key : key;
  ref = 'ref' in props ? props.ref : ref;
  delete props.ref;
  delete props.key;
  return {
    $$typeof: __react_ElementType,
    type: type,
    ref: ref,
    key: key,
    props: props,
    _owner: __react_CurrentOwner.current
  };
}
const handleRef = ref => {
  console.log(ref);
};
function Component() {
  return null;
}
const otherProps = {};

// safe to remove
const refLast = _jsxFromOwnedExtends(Component, null, {
  className: 'cell'
}, otherProps, {
  ref: handleRef
});

// ref = otherProps.ref ?? handleRef
const refFirst = _jsxFromOwnedExtends(Component, null, {
  ref: handleRef
}, otherProps, {
  className: 'cell'
});
