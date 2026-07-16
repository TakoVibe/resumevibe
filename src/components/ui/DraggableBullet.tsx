import React, { useState, useRef } from 'react';
import { GripVertical } from 'lucide-react';

interface Props {
    children: React.ReactNode;
    index: number;
    onReorder: (fromIndex: number, toIndex: number) => void;
    isEditable: boolean;
    /** Use 'li' or 'div' as the wrapper element */
    as?: 'li' | 'div';
    className?: string;
}

export function DraggableBullet({
    children,
    index,
    onReorder,
    isEditable,
    as: Tag = 'li',
    className = ''
}: Props) {
    const [isDragging, setIsDragging] = useState(false);
    const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);
    const dragRef = useRef<HTMLElement>(null);

    if (!isEditable) {
        return <Tag className={className}>{children}</Tag>;
    }

    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        // Make the drag image slightly transparent
        if (dragRef.current) {
            e.dataTransfer.setDragImage(dragRef.current, 0, 0);
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDropPosition(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        setDropPosition(e.clientY < midY ? 'above' : 'below');
    };

    const handleDragLeave = () => {
        setDropPosition(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (isNaN(fromIndex) || fromIndex === index) {
            setDropPosition(null);
            return;
        }

        // Determine target index based on drop position
        let toIndex = index;
        if (dropPosition === 'below') {
            toIndex = fromIndex < index ? index : index + 1;
        } else {
            toIndex = fromIndex > index ? index : index - 1;
        }

        if (toIndex !== fromIndex && toIndex >= 0) {
            onReorder(fromIndex, toIndex);
        }
        setDropPosition(null);
    };

    const dropIndicatorClass = dropPosition === 'above'
        ? 'before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-[var(--accent)] before:rounded-full before:z-20'
        : dropPosition === 'below'
            ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--accent)] after:rounded-full after:z-20'
            : '';

    return React.createElement(
        Tag,
        {
            ref: dragRef,
            className: `${className} relative group/drag ${isDragging ? 'opacity-30' : ''} ${dropIndicatorClass}`,
            draggable: true,
            onDragStart: handleDragStart,
            onDragEnd: handleDragEnd,
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop
        },
        <>
            {/* Drag handle - visible on hover */}
            <div
                className="absolute -left-5 top-0 bottom-0 flex items-start pt-[2px] opacity-0 group-hover/drag:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity print:hidden z-10"
                onMouseDown={(e) => e.stopPropagation()}
                title="Drag to reorder"
            >
                <GripVertical size={14} className="text-[var(--text-muted)]" />
            </div>
            {children}
        </>
    );
}
