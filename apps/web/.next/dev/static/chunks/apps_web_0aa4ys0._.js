(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/components/board/BulletinBoard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BulletinBoard",
    ()=>BulletinBoard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$useBoards$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/boards/useBoards.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$ProjectPin$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/board/ProjectPin.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$CreateBoardModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/board/CreateBoardModal.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function BulletinBoard() {
    _s();
    const { boards, loading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$useBoards$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useBoards"])();
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"])();
    const selectedId = params?.boardId;
    const [showCreate, setShowCreate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative mx-auto max-w-6xl px-6 py-10 sm:px-10",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-8 flex items-end justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "font-serif text-4xl text-stone-900 sm:text-5xl",
                        children: "Your worlds, all in one place."
                    }, void 0, false, {
                        fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                        lineNumber: 18,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setShowCreate(true),
                        className: "flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-stone-700",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-lg leading-none",
                                children: "+"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                                lineNumber: 25,
                                columnNumber: 11
                            }, this),
                            "New board"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                        lineNumber: 21,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "cork-texture relative rounded-2xl border-8 border-[#5b3a24] p-8 sm:p-12",
                children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "py-16 text-center text-stone-500",
                    children: "Loading your boards…"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                    lineNumber: 32,
                    columnNumber: 11
                }, this) : boards.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(EmptyState, {
                    onCreate: ()=>setShowCreate(true)
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                    lineNumber: 34,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap gap-8",
                    children: boards.map((board)=>// While this board is the "selected" one (we're on /boards/[id]),
                        // leave its spot empty — BoardDetail renders a matching layoutId
                        // so Framer Motion can morph the pin into the full panel instead
                        // of two copies existing at once.
                        board.id === selectedId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-64 shrink-0"
                        }, board.id, false, {
                            fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                            lineNumber: 43,
                            columnNumber: 17
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$ProjectPin$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ProjectPin"], {
                            board: board
                        }, board.id, false, {
                            fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                            lineNumber: 45,
                            columnNumber: 17
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                    lineNumber: 36,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, this),
            showCreate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$board$2f$CreateBoardModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CreateBoardModal"], {
                onClose: ()=>setShowCreate(false)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                lineNumber: 52,
                columnNumber: 22
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
_s(BulletinBoard, "rHVqpW2vPaYCxNJffwHHjUSGRis=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$useBoards$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useBoards"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"]
    ];
});
_c = BulletinBoard;
function EmptyState({ onCreate }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col items-center justify-center gap-3 py-20 text-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "font-serif text-xl text-stone-700",
                children: "Pin your first inspiration."
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                lineNumber: 60,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "max-w-sm text-sm text-stone-500",
                children: "Upload a few photos that capture a look you love — a room, an outfit, a place. We'll turn it into a vibe you can shop from."
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                lineNumber: 63,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: onCreate,
                className: "mt-2 rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white",
                children: "Create a board"
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
                lineNumber: 67,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/board/BulletinBoard.tsx",
        lineNumber: 59,
        columnNumber: 5
    }, this);
}
_c1 = EmptyState;
var _c, _c1;
__turbopack_context__.k.register(_c, "BulletinBoard");
__turbopack_context__.k.register(_c1, "EmptyState");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/board/CreateBoardModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CreateBoardModal",
    ()=>CreateBoardModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$useBoards$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/boards/useBoards.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function CreateBoardModal({ onClose }) {
    _s();
    const { createBoard } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$useBoards$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useBoards"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [name, setName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [files, setFiles] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [submitting, setSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "w-full max-w-lg rounded-xl bg-[#faf6ee] p-6 shadow-2xl",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "font-serif text-2xl text-stone-900",
                    children: "New board"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                    lineNumber: 38,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-1 text-sm text-stone-500",
                    children: "Give it a name and drop in a few photos that capture the look."
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                    lineNumber: 39,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    value: name,
                    onChange: (e)=>setName(e.target.value),
                    placeholder: "Dream Apartment",
                    className: "mt-4 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                    lineNumber: 43,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onDragOver: (e)=>e.preventDefault(),
                    onDrop: (e)=>{
                        e.preventDefault();
                        handleFiles(e.dataTransfer.files);
                    },
                    onClick: ()=>fileInputRef.current?.click(),
                    className: "mt-4 flex min-h-28 cursor-pointer flex-wrap gap-2 rounded-md border-2 border-dashed border-stone-300 p-3",
                    children: [
                        previews.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "m-auto text-sm text-stone-400",
                            children: "Click or drag photos here"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                            lineNumber: 60,
                            columnNumber: 13
                        }, this),
                        previews.map((src, i)=>// eslint-disable-next-line @next/next/no-img-element
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: src,
                                alt: "",
                                className: "h-20 w-20 rounded-sm object-cover"
                            }, i, false, {
                                fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                                lineNumber: 66,
                                columnNumber: 13
                            }, this)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            ref: fileInputRef,
                            type: "file",
                            accept: "image/*",
                            multiple: true,
                            className: "hidden",
                            onChange: (e)=>handleFiles(e.target.files)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                            lineNumber: 68,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                    lineNumber: 50,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-6 flex justify-end gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            className: "rounded-full px-4 py-2 text-sm text-stone-600 hover:bg-stone-200",
                            children: "Cancel"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                            lineNumber: 79,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleSubmit,
                            disabled: !name.trim() || files.length === 0 || submitting,
                            className: "rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40",
                            children: submitting ? "Creating…" : "Create board"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                            lineNumber: 85,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
                    lineNumber: 78,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
            lineNumber: 37,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/components/board/CreateBoardModal.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
_s(CreateBoardModal, "Ml+8shxmPoihDJEpAYczMRx343c=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$useBoards$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useBoards"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = CreateBoardModal;
var _c;
__turbopack_context__.k.register(_c, "CreateBoardModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/board/ProjectPin.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProjectPin",
    ()=>ProjectPin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/navigation.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
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
function ProjectPin({ board }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const hash = hashString(board.id);
    const rotation = hash % 9 - 4; // -4deg .. 4deg, deterministic per board
    const pinColor = PIN_COLORS[hash % PIN_COLORS.length];
    const photos = board.images.slice(0, 4);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].button, {
        layoutId: `pin-${board.id}`,
        onClick: ()=>router.push(`/boards/${board.id}`),
        style: {
            rotate: rotation
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)]",
                style: {
                    background: pinColor
                }
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-2 gap-1.5",
                children: photos.length > 0 ? photos.map((img)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "aspect-square overflow-hidden rounded-[2px] border border-white bg-stone-200",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                            src: img.image_url,
                            alt: "",
                            className: "h-full w-full object-cover"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                            lineNumber: 47,
                            columnNumber: 15
                        }, this)
                    }, img.id, false, {
                        fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                        lineNumber: 42,
                        columnNumber: 13
                    }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "col-span-2 flex aspect-[2/1] items-center justify-center rounded-[2px] border border-dashed border-stone-400 text-xs text-stone-400",
                    children: "No photos yet"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                    lineNumber: 51,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                lineNumber: 39,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "mt-3 truncate font-serif text-lg text-stone-900",
                children: board.name
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                lineNumber: 57,
                columnNumber: 7
            }, this),
            board.vibe && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 truncate text-xs text-stone-500",
                children: board.vibe.qualities.slice(0, 3).join(" · ")
            }, void 0, false, {
                fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
                lineNumber: 62,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/board/ProjectPin.tsx",
        lineNumber: 26,
        columnNumber: 5
    }, this);
}
_s(ProjectPin, "fN7XvhJ+p5oE6+Xlo0NJmXpxjC8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = ProjectPin;
var _c;
__turbopack_context__.k.register(_c, "ProjectPin");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/lib/boards/store.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch  {
        return [];
    }
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/lib/boards/useBoards.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BoardsProvider",
    ()=>BoardsProvider,
    "useBoards",
    ()=>useBoards
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/boards/store.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
const BoardsContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function BoardsProvider({ children }) {
    _s();
    const [boards, setBoards] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "BoardsProvider.useCallback[refresh]": async ()=>{
            setBoards(await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getBoards"]());
            setLoading(false);
        }
    }["BoardsProvider.useCallback[refresh]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BoardsProvider.useEffect": ()=>{
            refresh();
        }
    }["BoardsProvider.useEffect"], [
        refresh
    ]);
    const createBoard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "BoardsProvider.useCallback[createBoard]": async (input)=>{
            const board = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createBoard"](input);
            await refresh();
            return board;
        }
    }["BoardsProvider.useCallback[createBoard]"], [
        refresh
    ]);
    const addImages = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "BoardsProvider.useCallback[addImages]": async (boardId, files)=>{
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addImagesToBoard"](boardId, files);
            await refresh();
        }
    }["BoardsProvider.useCallback[addImages]"], [
        refresh
    ]);
    const removeBoard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "BoardsProvider.useCallback[removeBoard]": async (boardId)=>{
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$boards$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteBoard"](boardId);
            await refresh();
        }
    }["BoardsProvider.useCallback[removeBoard]"], [
        refresh
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BoardsContext.Provider, {
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
_s(BoardsProvider, "NfbTvHyx0+Xz5Iykl6y6PK1Embs=");
_c = BoardsProvider;
function useBoards() {
    _s1();
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(BoardsContext);
    if (!ctx) throw new Error("useBoards must be used inside <BoardsProvider>");
    return ctx;
}
_s1(useBoards, "/dMy7t63NXD4eYACoT93CePwGrg=");
var _c;
__turbopack_context__.k.register(_c, "BoardsProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_web_0aa4ys0._.js.map