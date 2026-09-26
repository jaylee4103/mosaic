module.exports = [
"[project]/apps/web/components/board/BoardSlot.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BoardSlot",
    ()=>BoardSlot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
function BoardSlot({ slot, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex w-full justify-center lg:absolute lg:block lg:w-auto lg:left-[var(--slot-left)] lg:top-[var(--slot-top)]",
        style: {
            "--slot-left": slot.left,
            "--slot-top": slot.top
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/apps/web/components/board/BoardSlot.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, this);
}
}),
"[project]/apps/web/components/board/BulletinBoard.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BulletinBoard",
    ()=>BulletinBoard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$useBoards$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/boards/useBoards.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$layoutSlots$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/boards/layoutSlots.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$BoardSlot$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/board/BoardSlot.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$ProjectPin$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/board/ProjectPin.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$PlaceholderPin$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/board/PlaceholderPin.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$CreateBoardModal$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/board/CreateBoardModal.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
const INVITE_PROMPTS = [
    "your room",
    "an outfit",
    "a trip",
    "a gift"
];
function BulletinBoard() {
    const { boards, loading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$useBoards$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useBoards"])();
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useParams"])();
    const selectedId = params?.boardId;
    const [showCreate, setShowCreate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [createDefaultName, setCreateDefaultName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    function openCreate(defaultName = "") {
        setCreateDefaultName(defaultName);
        setShowCreate(true);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative mx-auto max-w-7xl px-6 py-10 sm:px-10",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-8 flex flex-wrap items-end justify-between gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "font-[family-name:var(--font-fraunces)] text-4xl text-stone-900 sm:text-5xl",
                                children: "mosaic"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                                lineNumber: 31,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1 text-sm text-stone-500",
                                children: "your worlds, all in one place"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                                lineNumber: 34,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                        lineNumber: 30,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>openCreate(),
                        className: "rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-stone-700",
                        children: "+ new board"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                        lineNumber: 38,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-[28px] bg-[#fbfaf6] p-3 shadow-[0_30px_60px_-15px_rgba(60,40,20,0.35)] sm:p-5",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "cork-texture relative min-h-[640px] overflow-hidden rounded-[18px] sm:min-h-[760px]",
                    children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "absolute inset-0 flex items-center justify-center text-[#f6efe1]/90",
                        children: "loading your boards…"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                        lineNumber: 49,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col items-center gap-6 p-6 sm:p-10 lg:block lg:h-full lg:p-0",
                        children: boards.length === 0 ? INVITE_PROMPTS.map((label, i)=>{
                            const slot = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$layoutSlots$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LAYOUT_SLOTS"][i % __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$layoutSlots$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LAYOUT_SLOTS"].length];
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$BoardSlot$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BoardSlot"], {
                                slot: slot,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$PlaceholderPin$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PlaceholderPin"], {
                                    label: label,
                                    rotate: slot.rotate,
                                    onClick: ()=>openCreate(label)
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                                    lineNumber: 59,
                                    columnNumber: 25
                                }, this)
                            }, label, false, {
                                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                                lineNumber: 58,
                                columnNumber: 23
                            }, this);
                        }) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                boards.map((board, i)=>{
                                    const slot = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$layoutSlots$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LAYOUT_SLOTS"][i % __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$layoutSlots$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LAYOUT_SLOTS"].length];
                                    // While this board is "selected" (we're on
                                    // /boards/[id]), leave its spot empty — BoardDetail
                                    // renders the matching layoutId so Framer Motion can
                                    // morph the pin into the full panel.
                                    if (board.id === selectedId) {
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$BoardSlot$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BoardSlot"], {
                                            slot: slot,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-64"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                                                lineNumber: 78,
                                                columnNumber: 31
                                            }, this)
                                        }, board.id, false, {
                                            fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                                            lineNumber: 77,
                                            columnNumber: 29
                                        }, this);
                                    }
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$BoardSlot$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BoardSlot"], {
                                        slot: slot,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$ProjectPin$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ProjectPin"], {
                                            board: board,
                                            rotate: slot.rotate
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                                            lineNumber: 84,
                                            columnNumber: 29
                                        }, this)
                                    }, board.id, false, {
                                        fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                                        lineNumber: 83,
                                        columnNumber: 27
                                    }, this);
                                }),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$BoardSlot$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BoardSlot"], {
                                    slot: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$layoutSlots$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LAYOUT_SLOTS"][boards.length % __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$layoutSlots$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LAYOUT_SLOTS"].length],
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$PlaceholderPin$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PlaceholderPin"], {
                                        label: "add another vibe",
                                        rotate: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$layoutSlots$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LAYOUT_SLOTS"][boards.length % __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$layoutSlots$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LAYOUT_SLOTS"].length].rotate,
                                        onClick: ()=>openCreate()
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                                        lineNumber: 91,
                                        columnNumber: 25
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                                    lineNumber: 88,
                                    columnNumber: 23
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                            lineNumber: 68,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                        lineNumber: 53,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                    lineNumber: 47,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                lineNumber: 46,
                columnNumber: 7
            }, this),
            showCreate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$CreateBoardModal$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CreateBoardModal"], {
                initialName: createDefaultName,
                onClose: ()=>setShowCreate(false)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                lineNumber: 105,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
        lineNumber: 28,
        columnNumber: 5
    }, this);
}
}),
"[project]/apps/web/components/board/CreateBoardModal.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CreateBoardModal",
    ()=>CreateBoardModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$useBoards$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/boards/useBoards.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
function CreateBoardModal({ initialName = "", onClose }) {
    const { createBoard } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$useBoards$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useBoards"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [name, setName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(initialName);
    const [files, setFiles] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [submitting, setSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const previews = files.map((f)=>URL.createObjectURL(f));
    function handleFiles(list) {
        if (!list) return;
        setFiles((prev)=>[
                ...prev,
                ...Array.from(list)
            ]);
    }
    async function handleSubmit() {
        if (!name.trim() || files.length === 0) return;
        setSubmitting(true);
        const board = await createBoard({
            name,
            images: files.map((file)=>({
                    file
                }))
        });
        setSubmitting(false);
        onClose();
        router.push(`/boards/${board.id}`);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "w-full max-w-lg rounded-xl bg-[#faf6ee] p-6 shadow-2xl",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "font-[family-name:var(--font-fraunces)] text-2xl text-stone-900",
                    children: "new board"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                    lineNumber: 44,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-1 text-sm text-stone-500",
                    children: "give it a name and drop in a few photos that capture the look."
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                    lineNumber: 47,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    value: name,
                    onChange: (e)=>setName(e.target.value),
                    placeholder: "dream apartment",
                    className: "mt-4 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                    lineNumber: 51,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onDragOver: (e)=>e.preventDefault(),
                    onDrop: (e)=>{
                        e.preventDefault();
                        handleFiles(e.dataTransfer.files);
                    },
                    onClick: ()=>fileInputRef.current?.click(),
                    className: "mt-4 flex min-h-28 cursor-pointer flex-wrap gap-2 rounded-md border-2 border-dashed border-stone-300 p-3",
                    children: [
                        previews.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "m-auto text-sm text-stone-400",
                            children: "click or drag photos here"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                            lineNumber: 68,
                            columnNumber: 13
                        }, this),
                        previews.map((src, i)=>// eslint-disable-next-line @next/next/no-img-element
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: src,
                                alt: "",
                                className: "h-20 w-20 rounded-sm object-cover"
                            }, i, false, {
                                fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                                lineNumber: 74,
                                columnNumber: 13
                            }, this)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            ref: fileInputRef,
                            type: "file",
                            accept: "image/*",
                            multiple: true,
                            className: "hidden",
                            onChange: (e)=>handleFiles(e.target.files)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                            lineNumber: 76,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                    lineNumber: 58,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-6 flex justify-end gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            className: "rounded-full px-4 py-2 text-sm text-stone-600 hover:bg-stone-200",
                            children: "cancel"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                            lineNumber: 87,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleSubmit,
                            disabled: !name.trim() || files.length === 0 || submitting,
                            className: "rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40",
                            children: submitting ? "creating…" : "create board"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                            lineNumber: 93,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                    lineNumber: 86,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
            lineNumber: 43,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
        lineNumber: 42,
        columnNumber: 5
    }, this);
}
}),
"[project]/apps/web/components/board/PlaceholderPin.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PlaceholderPin",
    ()=>PlaceholderPin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
"use client";
;
;
function PlaceholderPin({ label, rotate, onClick }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].button, {
        onClick: onClick,
        style: {
            rotate
        },
        whileHover: {
            rotate: 0,
            y: -6,
            scale: 1.02
        },
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24
        },
        className: "group relative flex aspect-square w-64 flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-[#a9825a]/50 bg-[#f6efe1]/60 text-[#8a6a48] shadow-sm transition-colors hover:border-[#a9825a] hover:bg-[#f6efe1]/90",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-3xl leading-none",
                children: "+"
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/PlaceholderPin.tsx",
                lineNumber: 22,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-sm",
                children: label
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/PlaceholderPin.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/board/PlaceholderPin.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
}),
"[project]/apps/web/components/board/ProjectPin.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProjectPin",
    ()=>ProjectPin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/navigation.js [app-ssr] (ecmascript)");
"use client";
;
;
;
const PIN_COLORS = [
    "#c1440e",
    "#2f6f6a",
    "#3a5a40",
    "#b08900",
    "#3d4a99"
];
function hashString(input) {
    let hash = 0;
    for(let i = 0; i < input.length; i++){
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}
function ProjectPin({ board, rotate }) {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const hash = hashString(board.id);
    const pinColor = PIN_COLORS[hash % PIN_COLORS.length];
    const photos = board.images.slice(0, 4);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].button, {
        layoutId: `pin-${board.id}`,
        onClick: ()=>router.push(`/boards/${board.id}`),
        style: {
            rotate
        },
        whileHover: {
            rotate: 0,
            y: -6,
            scale: 1.02
        },
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24
        },
        className: "group relative w-64 shrink-0 rounded-sm bg-[#faf6ee] p-3 pb-5 text-left shadow-[0_8px_20px_rgba(0,0,0,0.18)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)]",
                style: {
                    background: pinColor
                }
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                lineNumber: 39,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-2 gap-1.5",
                children: photos.length > 0 ? photos.map((img)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "aspect-square overflow-hidden rounded-[2px] border border-white bg-stone-200",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                            src: img.image_url,
                            alt: "",
                            className: "h-full w-full object-cover"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                            lineNumber: 52,
                            columnNumber: 15
                        }, this)
                    }, img.id, false, {
                        fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                        lineNumber: 47,
                        columnNumber: 13
                    }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "col-span-2 flex aspect-[2/1] items-center justify-center rounded-[2px] border border-dashed border-stone-400 text-xs text-stone-400",
                    children: "no photos yet"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                    lineNumber: 56,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "mt-3 truncate font-[family-name:var(--font-fraunces)] text-lg text-stone-900",
                children: board.name
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                lineNumber: 62,
                columnNumber: 7
            }, this),
            board.vibe && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 truncate text-xs text-stone-500",
                children: board.vibe.qualities.slice(0, 3).join(" · ")
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                lineNumber: 67,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
        lineNumber: 31,
        columnNumber: 5
    }, this);
}
}),
"[project]/apps/web/lib/boards/layoutSlots.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LAYOUT_SLOTS",
    ()=>LAYOUT_SLOTS
]);
const LAYOUT_SLOTS = [
    {
        left: "3%",
        top: "8%",
        rotate: -4
    },
    {
        left: "27%",
        top: "5%",
        rotate: 3
    },
    {
        left: "51%",
        top: "10%",
        rotate: -2
    },
    {
        left: "74%",
        top: "6%",
        rotate: 4
    },
    {
        left: "10%",
        top: "50%",
        rotate: 2
    },
    {
        left: "34%",
        top: "46%",
        rotate: -3
    },
    {
        left: "57%",
        top: "52%",
        rotate: 3
    },
    {
        left: "74%",
        top: "44%",
        rotate: -4
    }
];
}),
"[project]/apps/web/lib/boards/store.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addImagesToBoard",
    ()=>addImagesToBoard,
    "createBoard",
    ()=>createBoard,
    "deleteBoard",
    ()=>deleteBoard,
    "getBoards",
    ()=>getBoards
]);
const STORAGE_KEY = "vibeboards:v1";
function readAll() {
    if ("TURBOPACK compile-time truthy", 1) return [];
    //TURBOPACK unreachable
    ;
}
function writeAll(boards) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
}
function fileToDataUrl(file) {
    return new Promise((resolve, reject)=>{
        const reader = new FileReader();
        reader.onload = ()=>resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
async function getBoards() {
    return readAll().sort((a, b)=>new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
async function createBoard(input) {
    const images = await Promise.all(input.images.map(async ({ file, note })=>({
            id: crypto.randomUUID(),
            image_url: await fileToDataUrl(file),
            note,
            created_at: new Date().toISOString()
        })));
    const board = {
        id: crypto.randomUUID(),
        name: input.name.trim() || "Untitled board",
        images,
        vibe: null,
        created_at: new Date().toISOString()
    };
    const boards = readAll();
    boards.push(board);
    writeAll(boards);
    // TODO(person 2/3): replace this with a real call, e.g.
    //   const res = await fetch(`/api/boards/${board.id}/analyze`, { method: "POST" });
    //   const { vibe } = await res.json();
    // For now we fake a vibe so the UI has something to render immediately.
    board.vibe = fakeVibe();
    writeAll(readAll().map((b)=>b.id === board.id ? board : b));
    return board;
}
async function addImagesToBoard(boardId, files) {
    const boards = readAll();
    const board = boards.find((b)=>b.id === boardId);
    if (!board) return null;
    const newImages = await Promise.all(files.map(async (file)=>({
            id: crypto.randomUUID(),
            image_url: await fileToDataUrl(file),
            created_at: new Date().toISOString()
        })));
    board.images.push(...newImages);
    writeAll(boards);
    return board;
}
async function deleteBoard(boardId) {
    writeAll(readAll().filter((b)=>b.id !== boardId));
}
function fakeVibe() {
    const options = [
        {
            name: "Sun-Washed Mediterranean",
            description: "A relaxed Mediterranean aesthetic built on warm natural materials and soft neutrals.",
            colors: [
                "cream",
                "terracotta",
                "olive",
                "brown"
            ],
            materials: [
                "linen",
                "wood",
                "ceramic",
                "rattan"
            ],
            qualities: [
                "warm",
                "natural",
                "relaxed",
                "minimal"
            ]
        },
        {
            name: "Quiet Coastal",
            description: "Faded blues and driftwood tones, unhurried and airy.",
            colors: [
                "sand",
                "sea glass",
                "driftwood",
                "chalk white"
            ],
            materials: [
                "linen",
                "rope",
                "weathered wood"
            ],
            qualities: [
                "breezy",
                "soft",
                "unhurried"
            ]
        }
    ];
    return options[Math.floor(Math.random() * options.length)];
}
}),
"[project]/apps/web/lib/boards/useBoards.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BoardsProvider",
    ()=>BoardsProvider,
    "useBoards",
    ()=>useBoards
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/boards/store.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
const BoardsContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(null);
function BoardsProvider({ children }) {
    const [boards, setBoards] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        setBoards(await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getBoards"]());
        setLoading(false);
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        refresh();
    }, [
        refresh
    ]);
    const createBoard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (input)=>{
        const board = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createBoard"](input);
        await refresh();
        return board;
    }, [
        refresh
    ]);
    const addImages = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (boardId, files)=>{
        await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addImagesToBoard"](boardId, files);
        await refresh();
    }, [
        refresh
    ]);
    const removeBoard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (boardId)=>{
        await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteBoard"](boardId);
        await refresh();
    }, [
        refresh
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(BoardsContext.Provider, {
        value: {
            boards,
            loading,
            createBoard,
            addImages,
            deleteBoard: removeBoard,
            refresh
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/apps/web/lib/boards/useBoards.tsx",
        lineNumber: 63,
        columnNumber: 5
    }, this);
}
function useBoards() {
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(BoardsContext);
    if (!ctx) throw new Error("useBoards must be used inside <BoardsProvider>");
    return ctx;
}
}),
];

//# sourceMappingURL=apps_web_0v6h4em._.js.map