"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdate_N_E"]("app/layout",{

/***/ "(app-pages-browser)/./src/app/globals.css":
/*!*****************************!*\
  !*** ./src/app/globals.css ***!
  \*****************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony default export */ __webpack_exports__[\"default\"] = (\"a39263a0e3f0\");\nif (true) { module.hot.accept() }\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL3NyYy9hcHAvZ2xvYmFscy5jc3MiLCJtYXBwaW5ncyI6IjtBQUFBLCtEQUFlLGNBQWM7QUFDN0IsSUFBSSxJQUFVLElBQUksaUJBQWlCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL3NyYy9hcHAvZ2xvYmFscy5jc3M/NmY5NyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCBcImEzOTI2M2EwZTNmMFwiXG5pZiAobW9kdWxlLmhvdCkgeyBtb2R1bGUuaG90LmFjY2VwdCgpIH1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./src/app/globals.css\n"));

/***/ }),

/***/ "(app-pages-browser)/./src/components/Navbar.tsx":
/*!***********************************!*\
  !*** ./src/components/Navbar.tsx ***!
  \***********************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   Navbar: function() { return /* binding */ Navbar; }\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"(app-pages-browser)/./node_modules/next/dist/compiled/react/jsx-dev-runtime.js\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"(app-pages-browser)/./node_modules/next/dist/compiled/react/index.js\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_navigation__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/navigation */ \"(app-pages-browser)/./node_modules/next/dist/api/navigation.js\");\n/* harmony import */ var _components_Logo__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/components/Logo */ \"(app-pages-browser)/./src/components/Logo.tsx\");\n/* harmony import */ var next_link__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! next/link */ \"(app-pages-browser)/./node_modules/next/dist/api/link.js\");\n/* harmony import */ var next_image__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! next/image */ \"(app-pages-browser)/./node_modules/next/dist/api/image.js\");\n/* harmony import */ var _utils_supabase_client__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @/utils/supabase/client */ \"(app-pages-browser)/./src/utils/supabase/client.ts\");\n/* harmony import */ var _store_userStore__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @/store/userStore */ \"(app-pages-browser)/./src/store/userStore.ts\");\n/* __next_internal_client_entry_do_not_use__ Navbar auto */ \nvar _s = $RefreshSig$();\n\n\n\n\n\n\n\n\nfunction Navbar() {\n    _s();\n    const [isLoading, setIsLoading] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(true);\n    const supabase = (0,_utils_supabase_client__WEBPACK_IMPORTED_MODULE_6__.createClient)();\n    const router = (0,next_navigation__WEBPACK_IMPORTED_MODULE_2__.useRouter)();\n    const pathname = (0,next_navigation__WEBPACK_IMPORTED_MODULE_2__.usePathname)();\n    const avatar = (0,_store_userStore__WEBPACK_IMPORTED_MODULE_7__.useUserStore)((state)=>state.avatar);\n    const setAvatar = (0,_store_userStore__WEBPACK_IMPORTED_MODULE_7__.useUserStore)((state)=>state.setAvatar);\n    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{\n        async function loadUserAvatar() {\n            setIsLoading(true);\n            const { data: { user } } = await supabase.auth.getUser();\n            if (user) {\n                const { data, error } = await supabase.from(\"users\").select(\"avatar_url\").eq(\"id\", user.id).single();\n                if (data === null || data === void 0 ? void 0 : data.avatar_url) {\n                    try {\n                        console.log(\"Raw avatar_url from DB:\", data.avatar_url);\n                        if (data.avatar_url === \"defpropic.jpg\" || data.avatar_url === \"/defpropic.jpg\") {\n                            setAvatar(\"/defpropic.jpg\");\n                        } else {\n                            const avatarUrl = supabase.storage.from(\"avatars\").getPublicUrl(data.avatar_url).data.publicUrl;\n                            console.log(\"Generated Avatar URL:\", avatarUrl);\n                            setAvatar(avatarUrl);\n                        }\n                    } catch (error) {\n                        console.error(\"Error getting avatar URL:\", error);\n                        setAvatar(\"/defpropic.jpg\");\n                    }\n                } else {\n                    console.log(\"No avatar_url, using default\");\n                    setAvatar(\"/defpropic.jpg\");\n                }\n            }\n            setIsLoading(false);\n        }\n        loadUserAvatar();\n    }, [\n        setAvatar\n    ]);\n    const handleLogoClick = async (e)=>{\n        e.preventDefault();\n        const { data: { user } } = await supabase.auth.getUser();\n        router.push(user ? \"/chat\" : \"/login\");\n    };\n    if (pathname === \"/login\" || pathname === \"/signup\") {\n        return null;\n    }\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"nav\", {\n        className: \"fixed top-0 left-0 right-0 p-2 bg-white shadow-sm z-10\",\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n            className: \"max-w-7xl mx-auto flex items-center justify-between\",\n            children: [\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"a\", {\n                    href: \"#\",\n                    onClick: handleLogoClick,\n                    className: \"flex items-center gap-2\",\n                    children: [\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_Logo__WEBPACK_IMPORTED_MODULE_3__.Logo, {\n                            className: \"w-8 h-8\"\n                        }, void 0, false, {\n                            fileName: \"/Users/gauntletAI/Desktop/Gauntlet/cg3/chat-genius/src/components/Navbar.tsx\",\n                            lineNumber: 73,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"span\", {\n                            className: \"text-2xl font-bold text-blue-600\",\n                            children: \"ChatGenius\"\n                        }, void 0, false, {\n                            fileName: \"/Users/gauntletAI/Desktop/Gauntlet/cg3/chat-genius/src/components/Navbar.tsx\",\n                            lineNumber: 74,\n                            columnNumber: 11\n                        }, this)\n                    ]\n                }, void 0, true, {\n                    fileName: \"/Users/gauntletAI/Desktop/Gauntlet/cg3/chat-genius/src/components/Navbar.tsx\",\n                    lineNumber: 72,\n                    columnNumber: 9\n                }, this),\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(next_link__WEBPACK_IMPORTED_MODULE_4__[\"default\"], {\n                    href: \"/profile\",\n                    className: \"flex items-center hover:opacity-80 transition-opacity\",\n                    children: !isLoading && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(next_image__WEBPACK_IMPORTED_MODULE_5__[\"default\"], {\n                        src: avatar,\n                        alt: \"Profile\",\n                        width: 32,\n                        height: 32,\n                        className: \"rounded-full\"\n                    }, void 0, false, {\n                        fileName: \"/Users/gauntletAI/Desktop/Gauntlet/cg3/chat-genius/src/components/Navbar.tsx\",\n                        lineNumber: 82,\n                        columnNumber: 13\n                    }, this)\n                }, void 0, false, {\n                    fileName: \"/Users/gauntletAI/Desktop/Gauntlet/cg3/chat-genius/src/components/Navbar.tsx\",\n                    lineNumber: 77,\n                    columnNumber: 9\n                }, this)\n            ]\n        }, void 0, true, {\n            fileName: \"/Users/gauntletAI/Desktop/Gauntlet/cg3/chat-genius/src/components/Navbar.tsx\",\n            lineNumber: 71,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"/Users/gauntletAI/Desktop/Gauntlet/cg3/chat-genius/src/components/Navbar.tsx\",\n        lineNumber: 70,\n        columnNumber: 5\n    }, this);\n}\n_s(Navbar, \"gXhVntaEkjniX9d6Pu3VOCmvER8=\", false, function() {\n    return [\n        next_navigation__WEBPACK_IMPORTED_MODULE_2__.useRouter,\n        next_navigation__WEBPACK_IMPORTED_MODULE_2__.usePathname,\n        _store_userStore__WEBPACK_IMPORTED_MODULE_7__.useUserStore,\n        _store_userStore__WEBPACK_IMPORTED_MODULE_7__.useUserStore\n    ];\n});\n_c = Navbar;\nvar _c;\n$RefreshReg$(_c, \"Navbar\");\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL3NyYy9jb21wb25lbnRzL05hdmJhci50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBRTRDO0FBQ0U7QUFDTDtBQUNaO0FBQ0U7QUFDYTtBQUNXO0FBQ047QUFFMUMsU0FBU1M7O0lBQ2QsTUFBTSxDQUFDQyxXQUFXQyxhQUFhLEdBQUdYLCtDQUFRQSxDQUFDO0lBQzNDLE1BQU1ZLFdBQVdMLG9FQUFZQTtJQUM3QixNQUFNTSxTQUFTUCwwREFBU0E7SUFDeEIsTUFBTVEsV0FBV1osNERBQVdBO0lBQzVCLE1BQU1hLFNBQVNQLDhEQUFZQSxDQUFDLENBQUNRLFFBQVVBLE1BQU1ELE1BQU07SUFDbkQsTUFBTUUsWUFBWVQsOERBQVlBLENBQUMsQ0FBQ1EsUUFBVUEsTUFBTUMsU0FBUztJQUV6RGhCLGdEQUFTQSxDQUFDO1FBQ1IsZUFBZWlCO1lBQ2JQLGFBQWE7WUFDYixNQUFNLEVBQUVRLE1BQU0sRUFBRUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxNQUFNUixTQUFTUyxJQUFJLENBQUNDLE9BQU87WUFDdEQsSUFBSUYsTUFBTTtnQkFDUixNQUFNLEVBQUVELElBQUksRUFBRUksS0FBSyxFQUFFLEdBQUcsTUFBTVgsU0FDM0JZLElBQUksQ0FBQyxTQUNMQyxNQUFNLENBQUMsY0FDUEMsRUFBRSxDQUFDLE1BQU1OLEtBQUtPLEVBQUUsRUFDaEJDLE1BQU07Z0JBRVQsSUFBSVQsaUJBQUFBLDJCQUFBQSxLQUFNVSxVQUFVLEVBQUU7b0JBQ3BCLElBQUk7d0JBQ0ZDLFFBQVFDLEdBQUcsQ0FBQywyQkFBMkJaLEtBQUtVLFVBQVU7d0JBQ3RELElBQUlWLEtBQUtVLFVBQVUsS0FBSyxtQkFBbUJWLEtBQUtVLFVBQVUsS0FBSyxrQkFBa0I7NEJBQy9FWixVQUFVO3dCQUNaLE9BQU87NEJBQ0wsTUFBTWUsWUFBWXBCLFNBQVNxQixPQUFPLENBQy9CVCxJQUFJLENBQUMsV0FDTFUsWUFBWSxDQUFDZixLQUFLVSxVQUFVLEVBQzVCVixJQUFJLENBQUNnQixTQUFTOzRCQUNqQkwsUUFBUUMsR0FBRyxDQUFDLHlCQUF5QkM7NEJBQ3JDZixVQUFVZTt3QkFDWjtvQkFDRixFQUFFLE9BQU9ULE9BQU87d0JBQ2RPLFFBQVFQLEtBQUssQ0FBQyw2QkFBNkJBO3dCQUMzQ04sVUFBVTtvQkFDWjtnQkFDRixPQUFPO29CQUNMYSxRQUFRQyxHQUFHLENBQUM7b0JBQ1pkLFVBQVU7Z0JBQ1o7WUFDRjtZQUNBTixhQUFhO1FBQ2Y7UUFFQU87SUFDRixHQUFHO1FBQUNEO0tBQVU7SUFFZCxNQUFNbUIsa0JBQWtCLE9BQU9DO1FBQzdCQSxFQUFFQyxjQUFjO1FBQ2hCLE1BQU0sRUFBRW5CLE1BQU0sRUFBRUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxNQUFNUixTQUFTUyxJQUFJLENBQUNDLE9BQU87UUFDdERULE9BQU8wQixJQUFJLENBQUNuQixPQUFPLFVBQVU7SUFDL0I7SUFFQSxJQUFJTixhQUFhLFlBQVlBLGFBQWEsV0FBVztRQUNuRCxPQUFPO0lBQ1Q7SUFFQSxxQkFDRSw4REFBQzBCO1FBQUlDLFdBQVU7a0JBQ2IsNEVBQUNDO1lBQUlELFdBQVU7OzhCQUNiLDhEQUFDRTtvQkFBRUMsTUFBSztvQkFBSUMsU0FBU1Q7b0JBQWlCSyxXQUFVOztzQ0FDOUMsOERBQUN0QyxrREFBSUE7NEJBQUNzQyxXQUFVOzs7Ozs7c0NBQ2hCLDhEQUFDSzs0QkFBS0wsV0FBVTtzQ0FBbUM7Ozs7Ozs7Ozs7Ozs4QkFHckQsOERBQUNyQyxpREFBSUE7b0JBQ0h3QyxNQUFLO29CQUNMSCxXQUFVOzhCQUVULENBQUMvQiwyQkFDQSw4REFBQ0wsa0RBQUtBO3dCQUNKMEMsS0FBS2hDO3dCQUNMaUMsS0FBSTt3QkFDSkMsT0FBTzt3QkFDUEMsUUFBUTt3QkFDUlQsV0FBVTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQU94QjtHQWxGZ0JoQzs7UUFHQ0gsc0RBQVNBO1FBQ1BKLHdEQUFXQTtRQUNiTSwwREFBWUE7UUFDVEEsMERBQVlBOzs7S0FOaEJDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL3NyYy9jb21wb25lbnRzL05hdmJhci50c3g/OWE2ZCJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIGNsaWVudCc7XG5cbmltcG9ydCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyB1c2VQYXRobmFtZSB9IGZyb20gJ25leHQvbmF2aWdhdGlvbic7XG5pbXBvcnQgeyBMb2dvIH0gZnJvbSAnQC9jb21wb25lbnRzL0xvZ28nO1xuaW1wb3J0IExpbmsgZnJvbSAnbmV4dC9saW5rJztcbmltcG9ydCBJbWFnZSBmcm9tICduZXh0L2ltYWdlJztcbmltcG9ydCB7IHVzZVJvdXRlciB9IGZyb20gJ25leHQvbmF2aWdhdGlvbic7XG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAL3V0aWxzL3N1cGFiYXNlL2NsaWVudCc7XG5pbXBvcnQgeyB1c2VVc2VyU3RvcmUgfSBmcm9tICdAL3N0b3JlL3VzZXJTdG9yZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBOYXZiYXIoKSB7XG4gIGNvbnN0IFtpc0xvYWRpbmcsIHNldElzTG9hZGluZ10gPSB1c2VTdGF0ZSh0cnVlKTtcbiAgY29uc3Qgc3VwYWJhc2UgPSBjcmVhdGVDbGllbnQoKTtcbiAgY29uc3Qgcm91dGVyID0gdXNlUm91dGVyKCk7XG4gIGNvbnN0IHBhdGhuYW1lID0gdXNlUGF0aG5hbWUoKTtcbiAgY29uc3QgYXZhdGFyID0gdXNlVXNlclN0b3JlKChzdGF0ZSkgPT4gc3RhdGUuYXZhdGFyKTtcbiAgY29uc3Qgc2V0QXZhdGFyID0gdXNlVXNlclN0b3JlKChzdGF0ZSkgPT4gc3RhdGUuc2V0QXZhdGFyKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGFzeW5jIGZ1bmN0aW9uIGxvYWRVc2VyQXZhdGFyKCkge1xuICAgICAgc2V0SXNMb2FkaW5nKHRydWUpO1xuICAgICAgY29uc3QgeyBkYXRhOiB7IHVzZXIgfSB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCk7XG4gICAgICBpZiAodXNlcikge1xuICAgICAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgICAgIC5mcm9tKCd1c2VycycpXG4gICAgICAgICAgLnNlbGVjdCgnYXZhdGFyX3VybCcpXG4gICAgICAgICAgLmVxKCdpZCcsIHVzZXIuaWQpXG4gICAgICAgICAgLnNpbmdsZSgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGRhdGE/LmF2YXRhcl91cmwpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JhdyBhdmF0YXJfdXJsIGZyb20gREI6JywgZGF0YS5hdmF0YXJfdXJsKTtcbiAgICAgICAgICAgIGlmIChkYXRhLmF2YXRhcl91cmwgPT09ICdkZWZwcm9waWMuanBnJyB8fCBkYXRhLmF2YXRhcl91cmwgPT09ICcvZGVmcHJvcGljLmpwZycpIHtcbiAgICAgICAgICAgICAgc2V0QXZhdGFyKCcvZGVmcHJvcGljLmpwZycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc3QgYXZhdGFyVXJsID0gc3VwYWJhc2Uuc3RvcmFnZVxuICAgICAgICAgICAgICAgIC5mcm9tKCdhdmF0YXJzJylcbiAgICAgICAgICAgICAgICAuZ2V0UHVibGljVXJsKGRhdGEuYXZhdGFyX3VybClcbiAgICAgICAgICAgICAgICAuZGF0YS5wdWJsaWNVcmw7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdHZW5lcmF0ZWQgQXZhdGFyIFVSTDonLCBhdmF0YXJVcmwpO1xuICAgICAgICAgICAgICBzZXRBdmF0YXIoYXZhdGFyVXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBhdmF0YXIgVVJMOicsIGVycm9yKTtcbiAgICAgICAgICAgIHNldEF2YXRhcignL2RlZnByb3BpYy5qcGcnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ05vIGF2YXRhcl91cmwsIHVzaW5nIGRlZmF1bHQnKTtcbiAgICAgICAgICBzZXRBdmF0YXIoJy9kZWZwcm9waWMuanBnJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNldElzTG9hZGluZyhmYWxzZSk7XG4gICAgfVxuXG4gICAgbG9hZFVzZXJBdmF0YXIoKTtcbiAgfSwgW3NldEF2YXRhcl0pO1xuXG4gIGNvbnN0IGhhbmRsZUxvZ29DbGljayA9IGFzeW5jIChlOiBSZWFjdC5Nb3VzZUV2ZW50KSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIHJvdXRlci5wdXNoKHVzZXIgPyAnL2NoYXQnIDogJy9sb2dpbicpO1xuICB9O1xuXG4gIGlmIChwYXRobmFtZSA9PT0gJy9sb2dpbicgfHwgcGF0aG5hbWUgPT09ICcvc2lnbnVwJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8bmF2IGNsYXNzTmFtZT1cImZpeGVkIHRvcC0wIGxlZnQtMCByaWdodC0wIHAtMiBiZy13aGl0ZSBzaGFkb3ctc20gei0xMFwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgPGEgaHJlZj1cIiNcIiBvbkNsaWNrPXtoYW5kbGVMb2dvQ2xpY2t9IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgPExvZ28gY2xhc3NOYW1lPVwidy04IGgtOFwiIC8+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC0yeGwgZm9udC1ib2xkIHRleHQtYmx1ZS02MDBcIj5DaGF0R2VuaXVzPC9zcGFuPlxuICAgICAgICA8L2E+XG5cbiAgICAgICAgPExpbmsgXG4gICAgICAgICAgaHJlZj1cIi9wcm9maWxlXCIgXG4gICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgaG92ZXI6b3BhY2l0eS04MCB0cmFuc2l0aW9uLW9wYWNpdHlcIlxuICAgICAgICA+XG4gICAgICAgICAgeyFpc0xvYWRpbmcgJiYgKFxuICAgICAgICAgICAgPEltYWdlXG4gICAgICAgICAgICAgIHNyYz17YXZhdGFyfVxuICAgICAgICAgICAgICBhbHQ9XCJQcm9maWxlXCJcbiAgICAgICAgICAgICAgd2lkdGg9ezMyfVxuICAgICAgICAgICAgICBoZWlnaHQ9ezMyfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJyb3VuZGVkLWZ1bGxcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICApfVxuICAgICAgICA8L0xpbms+XG4gICAgICA8L2Rpdj5cbiAgICA8L25hdj5cbiAgKTtcbn0gIl0sIm5hbWVzIjpbInVzZVN0YXRlIiwidXNlRWZmZWN0IiwidXNlUGF0aG5hbWUiLCJMb2dvIiwiTGluayIsIkltYWdlIiwidXNlUm91dGVyIiwiY3JlYXRlQ2xpZW50IiwidXNlVXNlclN0b3JlIiwiTmF2YmFyIiwiaXNMb2FkaW5nIiwic2V0SXNMb2FkaW5nIiwic3VwYWJhc2UiLCJyb3V0ZXIiLCJwYXRobmFtZSIsImF2YXRhciIsInN0YXRlIiwic2V0QXZhdGFyIiwibG9hZFVzZXJBdmF0YXIiLCJkYXRhIiwidXNlciIsImF1dGgiLCJnZXRVc2VyIiwiZXJyb3IiLCJmcm9tIiwic2VsZWN0IiwiZXEiLCJpZCIsInNpbmdsZSIsImF2YXRhcl91cmwiLCJjb25zb2xlIiwibG9nIiwiYXZhdGFyVXJsIiwic3RvcmFnZSIsImdldFB1YmxpY1VybCIsInB1YmxpY1VybCIsImhhbmRsZUxvZ29DbGljayIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInB1c2giLCJuYXYiLCJjbGFzc05hbWUiLCJkaXYiLCJhIiwiaHJlZiIsIm9uQ2xpY2siLCJzcGFuIiwic3JjIiwiYWx0Iiwid2lkdGgiLCJoZWlnaHQiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./src/components/Navbar.tsx\n"));

/***/ })

});