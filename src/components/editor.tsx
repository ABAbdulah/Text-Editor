import React, { useState, useRef, useCallback } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,Image, Paperclip, Link, Link2, Smile,PenTool } from 'lucide-react';
import { ReactSketchCanvas } from 'react-sketch-canvas'
import Modal from 'react-modal'
import type { ReactSketchCanvasRef } from 'react-sketch-canvas';
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

interface EditorState {
  content: string;
  history: string[];
  historyIndex: number;
  wordCount: number;
  charCount: number;
}

const TextEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    content: '',
    history: [''],
    historyIndex: 0,
    wordCount: 0,
    charCount: 0
  });

const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    alignRight: false,
    alignCenter: false,
    alignLeft: false,
    imageIcon: false
});

const [selectedFont] = useState('Arial');
const [selectedSize] = useState('16');
const [textColor] = useState('#000000');

// Update word and character count
const updateCounts = useCallback(() => {
if (editorRef.current) {
    const text = editorRef.current.textContent || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    
    setEditorState(prev => ({
    ...prev,
    wordCount: words,
    charCount: chars
    }));
}
}, []);

// Save to history
const saveToHistory = useCallback((content: string) => {
setEditorState(prev => {
    const newHistory = prev.history.slice(0, prev.historyIndex + 1);
    newHistory.push(content);
    return {
    ...prev,
    history: newHistory,
    historyIndex: newHistory.length - 1,
    content
    };
});
}, []);

const execCommand = useCallback((command: string, value: string = '') => {
if (editorRef.current) {
    editorRef.current.focus();
    document.execCommand(command, false, value);
    console.log('Command:', command, 'Value:', value);
    updateActiveFormats();
    saveToHistory(editorRef.current.innerHTML);
}
}, [saveToHistory]);



// Update active format states
const updateActiveFormats = useCallback(() => {
setActiveFormats({
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    alignRight: document.queryCommandState('justifyRight'),
    alignCenter: document.queryCommandState('justifyCenter'),
    alignLeft: document.queryCommandState('justifyLeft'),
    imageIcon: !!editorRef.current?.querySelector('img') // Check if there's an image
});
}, []);

// Handle content change
const handleContentChange = useCallback(() => {
    updateCounts();
    updateActiveFormats();
}, [updateCounts, updateActiveFormats]);

// Handle undo
const handleUndo = useCallback(() => {
if (editorState.historyIndex > 0) {
    const newIndex = editorState.historyIndex - 1;
    const content = editorState.history[newIndex];
    
    if (editorRef.current) {
    editorRef.current.innerHTML = content;
    }
    
    setEditorState(prev => ({
    ...prev,
    historyIndex: newIndex,
    content
    }));
}
}, [editorState.historyIndex, editorState.history]);

// Handle redo
const handleRedo = useCallback(() => {
if (editorState.historyIndex < editorState.history.length - 1) {
    const newIndex = editorState.historyIndex + 1;
    const content = editorState.history[newIndex];
    
    if (editorRef.current) {
    editorRef.current.innerHTML = content;
    }
    
    setEditorState(prev => ({
    ...prev,
    historyIndex: newIndex,
    content
    }));
}
}, [editorState.historyIndex, editorState.history]);

const insertLink = () => {
    let url = prompt('Enter URL (e.g., https://example.com):');
    if (!url) return;

    // 🧠 Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    editorRef.current?.focus();
    document.execCommand('createLink', false, url);

    // Optional: set target="_blank"
    const links = editorRef.current?.getElementsByTagName('a');
    if (links?.length) {
        const lastLink = links[links.length - 1];
        lastLink.setAttribute('target', '_blank');
        lastLink.setAttribute('rel', 'noopener noreferrer');
    }

    updateActiveFormats();
    if (editorRef.current) {
        saveToHistory(editorRef.current.innerHTML);
    }
};

const insertImageFromFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (e) => {
        const target = e.target as HTMLInputElement | null;
        if (!target || !target.files || target.files.length === 0) return;
        const file = target.files[0];
        if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result;
            execCommand('insertImage', base64 as string);
        };
        reader.readAsDataURL(file);
        }
    };

    input.click();
}, [execCommand]);

// Keyboard shortcuts
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
    case 'b':
        e.preventDefault();
        execCommand('bold');
        break;
    case 'i':
        e.preventDefault();
        execCommand('italic');
        break;
    case 'u':
        e.preventDefault();
        execCommand('underline');
        break;
    case 'z':
        e.preventDefault();
        if (e.shiftKey) {
        handleRedo();
        } else {
        handleUndo();
        }
        break;
    }
}
}, [execCommand, handleUndo, handleRedo]);

// // Initialize editor
// useEffect(() => {
//     if (editorRef.current) {
//     editorRef.current.innerHTML = `
//         <h1>Welcome to the Text Editor</h1>
//         <p>Start typing your content here.
//     `;
//     updateCounts();
//     }
// }, [updateCounts]);


//file upload
const fileInputRef = useRef<HTMLInputElement>(null);

const handleFileButtonClick = () => {
    fileInputRef.current?.click();  
};

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;

    editorRef.current.focus();

    const fileName = file.name;
    const fileURL = URL.createObjectURL(file); // creates a temporary blob URL

    // Insert a download link into the editor
    document.execCommand(
        'insertHTML',
        false,
        `<a href="${fileURL}" download="${fileName}" target="_blank" rel="noopener noreferrer">${fileName}</a>`
    );

    // Update formats/history
    updateActiveFormats();
    saveToHistory(editorRef.current.innerHTML);
};
// Google Drive link
const handleGoogleDriveLink = () => {
    const url = prompt('Enter Google Drive Link (must be public):');
    if (!url || !editorRef.current) return;

    // Optional: Add https:// if missing
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    // Optional: Ask for text to display
    const displayText = prompt('Enter display text:', 'View on Google Drive') || 'Google Drive Link';

    editorRef.current.focus();

    document.execCommand(
        'insertHTML',
        false,
        `<a href="${normalizedUrl}" target="_blank" rel="noopener noreferrer">${displayText}</a>`
    );

    updateActiveFormats();
    saveToHistory(editorRef.current.innerHTML);
};

//emoji
const [showPicker, setShowPicker] = useState(false)

const handleEmojiSelect = (emoji: { native: string | undefined; }) => {
    if (!editorRef.current) return
    editorRef.current.focus()

    // Insert emoji at cursor
    document.execCommand('insertText', false, emoji.native)
    setShowPicker(false)
}



//signature
const canvasRef = useRef<ReactSketchCanvasRef>(null)
const [modalOpen, setModalOpen] = useState(false)

const insertSignature = async () => {
const dataUrl = await canvasRef.current?.exportImage('png')
if (!dataUrl || !editorRef.current) return

editorRef.current.focus()
document.execCommand(
    'insertHTML',
    false,
    `<img src="${dataUrl}" alt="Signature" style="max-width: 120px; display: inline-block; border-radius: 4px; margin: 6px 0;" />`
)
    setModalOpen(false)
}

return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg overflow-hidden border">
        {/* Toolbar */}
        <div className="bg-white border-b p-2 flex flex-wrap items-center gap-1 ">
            {/* Text Format Dropdown */}
            <select             
                onChange={(e) => {             
                    const value = `<${e.target.value}>`;                  
                    setTimeout(() => {                 
                        execCommand('formatBlock', value);                 
                    }, 0);             
                }}              
                className="bg-white text-gray-700 px-1 py-1 rounded text-xs border border-gray-300 w-20"             
                title="Text Format"             
            >             
                <option value="p">Normal</option>             
                <option value="h1">Heading 1</option>             
                <option value="h2">Heading 2</option>             
                <option value="h3">Heading 3</option>             
                <option value="pre">Preformatted</option>         
            </select>

            {/* <div className="w-px h-6 bg-gray-300 mx-1"></div> */}

            {/* Text Formatting */}
            <button
                onClick={() => execCommand('bold')}
                className={`p-2 rounded ${activeFormats.bold ? 'bg-gray-300' : 'text-gray-700 hover:text-black hover:bg-gray-200'}`}
                title="Bold (Ctrl+B)"
            >
            <Bold size={18} />
            </button>
            <button
                onClick={() => execCommand('italic')}
                className={`p-2 rounded ${activeFormats.italic ? 'bg-gray-300' : 'text-gray-700 hover:text-black hover:bg-gray-200'}`}
                title="Italic (Ctrl+I)"
            >
            <Italic size={18} />
            </button>
            <button
                onClick={() => execCommand('underline')}
                className={`p-2 rounded ${activeFormats.underline ? 'bg-gray-300' : 'text-gray-700 hover:text-black hover:bg-gray-200'}`}
                title="Underline (Ctrl+U)"
            >
            <Underline size={18} />
            </button>

            {/* <div className="w-px h-6 bg-gray-300 mx-1"></div> */}

            {/* Alignment */}
            <button
                onClick={() => execCommand('justifyLeft')}
                className={`p-2 rounded ${activeFormats.alignLeft ? 'bg-gray-300' : 'text-gray-700 hover:text-black hover:bg-gray-200'}`}
                title="Align Left"
            >
            <AlignLeft size={18} />
            </button>
            <button
                onClick={() => execCommand('justifyCenter')}
                className={`p-2 rounded ${activeFormats.alignCenter ? 'bg-gray-300' : 'text-gray-700 hover:text-black hover:bg-gray-200'}`}
                title="Align Center"
            >
            <AlignCenter size={18} />
            </button>
            <button
                onClick={() => execCommand('justifyRight')}
                className={`p-2 rounded ${activeFormats.alignRight ? 'bg-gray-300' : 'text-gray-700 hover:text-black hover:bg-gray-200'}`}
                title="Align Right"
            >
            <AlignRight size={18} />
            </button>


            {/* Upload File Button */}
            <button
                onClick={handleFileButtonClick}
                className="p-2 text-gray-700 hover:text-black hover:bg-gray-200 rounded"
                title="Upload File"
            >
            <Paperclip size={18} />
            </button>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />

            {/* <div className="w-px h-6 bg-gray-300 mx-1"></div> */}

            {/* Insert Link */}
            <button
                onClick={insertLink}
                className="p-2 text-gray-700 hover:text-black hover:bg-gray-200 rounded"
                title="Insert Link"
            >
            <Link size={18} />
            </button>
            {/* <div className="w-px h-6 bg-gray-300 mx-1"></div> */}
            {/* emoji picker */}
            <button
                onClick={() => setShowPicker(!showPicker)}
                className="p-2 text-gray-700 hover:text-black hover:bg-gray-200 rounded"
                title="Insert Emoji"
            >
                <Smile size={18} />
            </button>


            <button
                onClick={handleGoogleDriveLink}
                className="p-2 text-gray-700 hover:text-black hover:bg-gray-200 rounded"
                title="Insert Google Drive Link"
            >
            <Link2 size={18} />
            </button>
            {/* Insert Image */}
            <button
                onClick={insertImageFromFile}
                className={`p-2 rounded ${activeFormats.imageIcon ? 'bg-gray-300' : 'text-gray-700 hover:text-black hover:bg-gray-200'}`}
                title="Insert Image"
            >
                <Image size={18} />
            </button>
            {showPicker && (
                <div className="absolute z-50 top-10">
                <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="light"
                />
                </div>
            )}
            {/* signature tool */}
            <button
                onClick={() => setModalOpen(true)}
                className="p-2 text-gray-700 hover:text-black hover:bg-gray-200 rounded"
                title="Insert Signature"
            >
                <PenTool size={18} />
            </button>

            {/* Modal for Drawing Signature */}
            <Modal
                isOpen={modalOpen}
                onRequestClose={() => setModalOpen(false)}
                className="bg-white p-6 rounded shadow-md w-[320px] mx-auto mt-20"
                overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start"
                ariaHideApp={false}
            >
                <h2 className="text-lg font-semibold mb-2">Draw your signature</h2>

                <ReactSketchCanvas
                    ref={canvasRef}
                    strokeWidth={2}
                    strokeColor="black"
                    style={{ border: '1px solid #ccc', borderRadius: '4px', height: 180 }}
                />

                <div className="mt-4 flex justify-end gap-2">
                <button
                    onClick={() => setModalOpen(false)}
                    className="text-sm text-gray-600 hover:underline"
                >
                    Cancel
                </button>
                <button
                    onClick={insertSignature}
                    className="bg-blue-600 text-white text-sm px-3 py-1 rounded"
                >
                    Insert
                </button>
                </div>
            </Modal>
        </div>



        {/* Editor - type your text here */}

            <div
                ref={editorRef}
                contentEditable
                className="min-h-96 p-6 outline-none prose prose-lg "
                onChange={handleContentChange}
                onKeyUp={handleContentChange}
                onMouseUp={updateActiveFormats}
                onKeyDown={handleKeyDown}
                style={{
                fontFamily: selectedFont,
                fontSize: selectedSize + 'px',
                color: textColor,
            }}
        />

    </div>
);

};

export default TextEditor;