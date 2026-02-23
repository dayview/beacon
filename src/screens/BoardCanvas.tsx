import React, { useState, useRef, useEffect } from "react";
import {
    MousePointer2,
    Hand,
    MessageSquare,
    Minus,
    Plus,
    Square,
    Circle,
    Type,
    Pen,
    StickyNote,
    ArrowLeft,
    Download,
    Share2,
    MoreHorizontal,
    Undo2,
    Redo2,
} from "lucide-react";

interface BoardCanvasProps {
    boardName: string;
    onBack: () => void;
}

type Tool = "pointer" | "hand" | "text" | "shape" | "pen" | "note";

export const BoardCanvas: React.FC<BoardCanvasProps> = ({ boardName, onBack }) => {
    const [activeTool, setActiveTool] = useState<Tool>("pointer");
    const [zoom, setZoom] = useState(100);
    const [notes, setNotes] = useState<Array<{ id: number; x: number; y: number; text: string; color: string }>>([]);
    const [editingNote, setEditingNote] = useState<number | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 25));

    const colors = ["#ffd02f", "#4262ff", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (activeTool !== "note") return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newNote = {
            id: Date.now(),
            x,
            y,
            text: "",
            color: colors[notes.length % colors.length],
        };
        setNotes((prev) => [...prev, newNote]);
        setEditingNote(newNote.id);
        setActiveTool("pointer");
    };

    const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
        { id: "pointer", icon: <MousePointer2 size={20} />, label: "Select" },
        { id: "hand", icon: <Hand size={20} />, label: "Pan" },
        { id: "text", icon: <Type size={20} />, label: "Text" },
        { id: "shape", icon: <Square size={20} />, label: "Shape" },
        { id: "pen", icon: <Pen size={20} />, label: "Draw" },
        { id: "note", icon: <StickyNote size={20} />, label: "Sticky Note" },
    ];

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
            {/* Top Toolbar */}
            <header className="flex h-14 items-center justify-between border-b border-[#050038]/10 bg-white px-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-[#050038]/60 hover:text-[#050038] transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-bold text-[#050038] text-xl">miro</span>
                    </button>
                    <div className="h-6 w-px bg-[#050038]/10" />
                    <span className="text-sm font-medium text-[#050038]">{boardName}</span>
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038] transition-colors">
                        <Undo2 size={16} />
                    </button>
                    <button className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038] transition-colors">
                        <Redo2 size={16} />
                    </button>
                    <div className="h-6 w-px bg-[#050038]/10 mx-1" />
                    <div className="flex items-center rounded-md border border-[#050038]/10 bg-white p-1">
                        <button
                            onClick={handleZoomOut}
                            className="rounded p-1 text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]"
                        >
                            <Minus size={16} />
                        </button>
                        <span className="min-w-[48px] text-center text-sm font-medium text-[#050038]">
                            {zoom}%
                        </span>
                        <button
                            onClick={handleZoomIn}
                            className="rounded p-1 text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 rounded-md border border-[#050038]/10 px-3 py-1.5 text-sm font-medium text-[#050038] hover:bg-[#fafafa] transition-colors">
                        <Share2 size={16} />
                        Share
                    </button>
                    <button className="flex items-center gap-2 rounded-md border border-[#050038]/10 px-3 py-1.5 text-sm font-medium text-[#050038] hover:bg-[#fafafa] transition-colors">
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Tool Bar */}
                <div className="flex w-14 flex-col items-center gap-1 border-r border-[#050038]/10 bg-white py-3">
                    {tools.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            title={tool.label}
                            className={`rounded-lg p-2.5 transition-colors ${activeTool === tool.id
                                    ? "bg-[#4262ff] text-white"
                                    : "text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]"
                                }`}
                        >
                            {tool.icon}
                        </button>
                    ))}
                </div>

                {/* Canvas */}
                <div
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="flex-1 relative overflow-hidden bg-[#fafafa]"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle, #050038 0.5px, transparent 0.5px)",
                        backgroundSize: `${20 * (zoom / 100)}px ${20 * (zoom / 100)}px`,
                        cursor: activeTool === "hand" ? "grab" : activeTool === "note" ? "crosshair" : "default",
                    }}
                >
                    {/* Center guide text (only when empty) */}
                    {notes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-[#050038]/5 flex items-center justify-center">
                                    <StickyNote size={28} className="text-[#050038]/20" />
                                </div>
                                <p className="text-lg font-semibold text-[#050038]/30">
                                    Start creating on your board
                                </p>
                                <p className="mt-1 text-sm text-[#050038]/20">
                                    Select a tool from the toolbar or click the sticky note icon to add notes
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Sticky Notes */}
                    {notes.map((note) => (
                        <div
                            key={note.id}
                            className="absolute w-48 rounded-lg shadow-lg transition-shadow hover:shadow-xl cursor-move"
                            style={{
                                left: note.x - 96,
                                top: note.y - 48,
                                backgroundColor: note.color,
                                transform: `scale(${zoom / 100})`,
                            }}
                        >
                            <div className="p-4 min-h-[96px]">
                                {editingNote === note.id ? (
                                    <textarea
                                        autoFocus
                                        className="w-full bg-transparent text-sm text-[#050038] placeholder:text-[#050038]/40 focus:outline-none resize-none"
                                        placeholder="Type something..."
                                        value={note.text}
                                        onChange={(e) =>
                                            setNotes((prev) =>
                                                prev.map((n) =>
                                                    n.id === note.id ? { ...n, text: e.target.value } : n
                                                )
                                            )
                                        }
                                        onBlur={() => setEditingNote(null)}
                                        rows={3}
                                    />
                                ) : (
                                    <p
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingNote(note.id);
                                        }}
                                        className="text-sm text-[#050038] min-h-[48px]"
                                    >
                                        {note.text || "Click to edit..."}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
