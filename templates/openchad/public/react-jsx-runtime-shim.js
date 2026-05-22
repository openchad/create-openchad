// Shim that re-exports react/jsx-runtime named exports from Vite's pre-bundled module
// This is needed because Vite's /@id/react/jsx-runtime only has a default export,
// but dynamically imported components expect named exports (jsx, jsxs, Fragment).
import ReactJSXRuntime from '/@id/react/jsx-runtime';

export const jsx = ReactJSXRuntime.jsx;

export const jsxs = ReactJSXRuntime.jsxs;

export const jsxDEV = ReactJSXRuntime.jsxDEV;

export const Fragment = ReactJSXRuntime.Fragment;

export default ReactJSXRuntime;