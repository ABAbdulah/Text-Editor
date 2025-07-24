import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "./Texteditor.module.css";

import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  // Image,
  Paperclip,
  Link,
  // Link2,
  Smile,
  PenTool,
  List,
  ListOrdered,
  Type,
  Highlighter,
} from "lucide-react";
import { ReactSketchCanvas } from "react-sketch-canvas";
import Modal from "react-modal";
import type { ReactSketchCanvasRef } from "react-sketch-canvas";
import EmojiPicker from "emoji-picker-react";
import { Theme } from "emoji-picker-react";
import LabelText from "../LabelText";
import ActionButtons from "../ActionButtons";

interface TextEditorProps {
  label?: string;
  required?: boolean;
  containerMaxheight?: string;
  containerMinheight?: string;
}

interface EditorState {
  content: string;
  history: string[];
  historyIndex: number;
  wordCount: number;
  charCount: number;
}

const TextEditor: React.FC<TextEditorProps> = (props) => {
  const {
    label,
    required,
    containerMaxheight = "8rem",
    containerMinheight = "8rem",
  } = props;
  const editorRef = useRef<HTMLDivElement>(null);
  const [, setEditorState] = useState<EditorState>({
    content: "",
    history: [""],
    historyIndex: 0,
    wordCount: 0,
    charCount: 0,
  });

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    alignRight: false,
    alignCenter: false,
    alignLeft: false,
    imageIcon: false,
  });

  const [selectedFont] = useState("Arial");
  const [selectedSize] = useState("16");
  const [textColor] = useState("#000000");

  // Update word and character count
  const updateCounts = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.textContent || "";
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;

      setEditorState((prev) => ({
        ...prev,
        wordCount: words,
        charCount: chars,
      }));
    }
  }, []);

  // Save to history
  const saveToHistory = useCallback((content: string) => {
    setEditorState((prev) => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(content);
      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        content,
      };
    });
  }, []);

  const execCommand = useCallback(
    (command: string, value: string = "") => {
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand(command, false, value);
        updateActiveFormats();
        saveToHistory(editorRef.current.innerHTML);
      }
    },
    [saveToHistory]
  );

  const [alignmentPopoverOpen, setAlignmentPopoverOpen] = useState(false);
  const [currentAlign, setCurrentAlign] = useState<"left" | "center" | "right">(
    "left"
  );

  const applyAlignment = (align: "left" | "center" | "right") => {
    setCurrentAlign(align);
    setAlignmentPopoverOpen(false);
    switch (align) {
      case "left":
        execCommand("justifyLeft");
        break;
      case "center":
        execCommand("justifyCenter");
        break;
      case "right":
        execCommand("justifyRight");
        break;
    }
  };

  // Update active format states
  const updateActiveFormats = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      alignRight: document.queryCommandState("justifyRight"),
      alignCenter: document.queryCommandState("justifyCenter"),
      alignLeft: document.queryCommandState("justifyLeft"),
      imageIcon: !!editorRef.current?.querySelector("img"), // Check if there's an image
    });
  }, []);

  // Handle content change
  const handleContentChange = useCallback(() => {
    updateCounts();
    updateActiveFormats();
  }, [updateCounts, updateActiveFormats]);

  // Handle undo
  // const handleUndo = useCallback(() => {
  //   if (editorState.historyIndex > 0) {
  //     const newIndex = editorState.historyIndex - 1;
  //     const content = editorState.history[newIndex];

  //     if (editorRef.current) {
  //       editorRef.current.innerHTML = content;
  //     }

  //     setEditorState((prev) => ({
  //       ...prev,
  //       historyIndex: newIndex,
  //       content,
  //     }));
  //   }
  // }, [editorState.historyIndex, editorState.history]);

  // Handle redo
  // const handleRedo = useCallback(() => {
  //   if (editorState.historyIndex < editorState.history.length - 1) {
  //     const newIndex = editorState.historyIndex + 1;
  //     const content = editorState.history[newIndex];

  //     if (editorRef.current) {
  //       editorRef.current.innerHTML = content;
  //     }

  //     setEditorState((prev) => ({
  //       ...prev,
  //       historyIndex: newIndex,
  //       content,
  //     }));
  //   }
  // }, [editorState.historyIndex, editorState.history]);

  const [showPicker, setShowPicker] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [pickerPosition] = useState({ top: 0, left: 0 });
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);

  const handleEmojiSelect = (emojiObject: { emoji: string }) => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    // Restore the saved cursor position
    if (savedSelection) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
      }
    }

    // Insert emoji at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const emojiNode = document.createTextNode(emojiObject.emoji);
      range.deleteContents();
      range.insertNode(emojiNode);
      range.setStartAfter(emojiNode);
      range.setEndAfter(emojiNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    setShowPicker(false);
  };

  const insertLink = () => {
    let url = prompt("Enter URL (e.g., https://example.com):");
    if (!url) return;

    // 🧠 Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    editorRef.current?.focus();
    document.execCommand("createLink", false, url);

    // Optional: set target="_blank"
    const links = editorRef.current?.getElementsByTagName("a");
    if (links?.length) {
      const lastLink = links[links.length - 1];
      lastLink.setAttribute("style", "color:#2563eb;text-decoration:underline");
      lastLink.setAttribute("target", "_blank");
      lastLink.setAttribute("rel", "noopener noreferrer");
    }

    updateActiveFormats();
    if (editorRef.current) {
      saveToHistory(editorRef.current.innerHTML);
    }
  };

  // const insertImageFromFile = useCallback(() => {
  //   const input = document.createElement("input");
  //   input.type = "file";
  //   input.accept = "image/*";

  //   input.onchange = (e) => {
  //     const target = e.target as HTMLInputElement | null;
  //     if (!target || !target.files || target.files.length === 0) return;

  //     const file = target.files[0];
  //     if (file) {
  //       const reader = new FileReader();
  //       reader.onload = (e) => {
  //         const base64 = e.target?.result as string;

  //         // Create image element
  //         const img = document.createElement("img");
  //         img.src = base64;
  //         img.alt = file.name;
  //         img.style.maxWidth = "100%";
  //         img.style.height = "auto";

  //         // Get the current selection/cursor position
  //         const selection = window.getSelection();
  //         if (selection && selection.rangeCount > 0) {
  //           const range = selection.getRangeAt(0);
  //           range.deleteContents(); // Remove any selected content
  //           range.insertNode(img);

  //           // Move cursor after the image
  //           range.setStartAfter(img);
  //           range.collapse(true);
  //           selection.removeAllRanges();
  //           selection.addRange(range);
  //         }
  //       };
  //       reader.readAsDataURL(file);
  //     }
  //   };

  //   input.click();
  // }, [execCommand]);

  // Keyboard shortcuts
  // const handleKeyDown = useCallback(
  //   (e: React.KeyboardEvent) => {
  //     if (e.ctrlKey || e.metaKey) {
  //       switch (e.key) {
  //         case "b":
  //           e.preventDefault();
  //           execCommand("bold");
  //           break;
  //         case "i":
  //           e.preventDefault();
  //           execCommand("italic");
  //           break;
  //         case "u":
  //           e.preventDefault();
  //           execCommand("underline");
  //           break;
  //         case "z":
  //           e.preventDefault();
  //           if (e.shiftKey) {
  //             handleRedo();
  //           } else {
  //             handleUndo();
  //           }
  //           break;
  //       }
  //     }
  //   },
  //   [execCommand, handleUndo, handleRedo]
  // );

  //file upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Add this state to store file references
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, File>>(
    new Map()
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;

    editorRef.current.focus();

    const fileName = file.name;
    const fileSize = (file.size / 1024).toFixed(1) + " KB";
    const fileId = Date.now().toString(); // Unique ID for this file

    // Store the file reference
    setUploadedFiles((prev) => new Map(prev).set(fileId, file));

    // Insert file link with data attribute for identification
    document.execCommand(
      "insertHTML",
      false,
      `<div 
      class="file-attachment" 
      data-file-id="${fileId}"
      style="display: inline-block; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 12px; margin: 4px 0; font-size: 14px; cursor: pointer; transition: background-color 0.2s;" 
      onmouseover="this.style.backgroundColor='#e5e7eb'" 
      onmouseout="this.style.backgroundColor='#f3f4f6'"
    >
      📎 <span style="color: #2563eb; text-decoration: none; font-weight: 500;">${fileName}</span>
      <span style="color: #6b7280; font-size: 12px; margin-left: 8px;">(${fileSize})</span>
    </div>`
    );

    // Update formats/history
    updateActiveFormats();
    saveToHistory(editorRef.current.innerHTML);
  };

  // Add click event listener to the editor for file downloads
  useEffect(() => {
    const handleEditorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const fileAttachment = target.closest(".file-attachment") as HTMLElement;

      if (fileAttachment) {
        const fileId = fileAttachment.getAttribute("data-file-id");
        if (fileId) {
          const file = uploadedFiles.get(fileId);
          if (file) {
            // Create temporary download link
            const url = URL.createObjectURL(file);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }
      }
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener("click", handleEditorClick);
      return () => {
        editor.removeEventListener("click", handleEditorClick);
      };
    }
  }, [uploadedFiles]);

  // Google Drive link
  // const handleGoogleDriveLink = () => {
  //   const url = prompt("Enter Google Drive Link (must be public):");
  //   if (!url || !editorRef.current) return;

  //   // Optional: Add https:// if missing
  //   const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  //   // Optional: Ask for text to display
  //   const displayText =
  //     prompt("Enter display text:", "View on Google Drive") ||
  //     "Google Drive Link";

  //   editorRef.current.focus();

  //   document.execCommand(
  //     "insertHTML",
  //     false,
  //     `<a href="${normalizedUrl}" target="_blank" rel="noopener noreferrer">${displayText}</a>`
  //   );

  //   updateActiveFormats();
  //   saveToHistory(editorRef.current.innerHTML);
  // };

  //signature
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const insertSignature = async () => {
    const dataUrl = await canvasRef.current?.exportImage("png");
    if (!dataUrl || !editorRef.current) return;

    editorRef.current.focus();
    document.execCommand(
      "insertHTML",
      false,
      `<img src="${dataUrl}" alt="Signature" style="max-width: 120px; display: inline-block; border-radius: 4px; margin: 6px 0;" />`
    );
    setModalOpen(false);
  };

  const buttonClasses = (active: boolean) =>
    `p-2 rounded transition-colors duration-100 text-black/80 hover:text-black/80 ${
      active
        ? "bg-gray/50 text-black/80 hover:bg-gray/70"
        : "bg-white text-black hover:bg-gray/50 hover:text-black/80 hover:shadow-sm"
    }
`;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showPicker &&
        !emojiButtonRef.current?.contains(e.target as Node) &&
        !document
          .querySelector(".emoji-picker-react")
          ?.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showPicker]);

  const setFontSize = (size: number) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // If text is selected
    if (!range.collapsed) {
      const span = document.createElement("span");
      span.style.fontSize = `${size}px`;

      const content = range.extractContents();

      // Remove all font-size styles from extracted content
      const removeAllFontSizes = (element: Node) => {
        if (element.nodeType === 1) {
          // Element node
          const el = element as HTMLElement;
          if (el.style) {
            el.style.fontSize = ""; // Remove font-size
            // If the element has no other styles, remove the style attribute entirely
            if (!el.style.cssText) {
              el.removeAttribute("style");
            }
          }
        }

        // Recursively process all child nodes
        element.childNodes.forEach((child) => removeAllFontSizes(child));
      };

      removeAllFontSizes(content);
      span.appendChild(content);
      range.insertNode(span);

      range.setStartAfter(span);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // No text selected, insert styled span with zero-width space
      const span = document.createElement("span");
      span.style.fontSize = `${size}px`;
      span.innerHTML = "\u200B"; // zero-width space

      range.insertNode(span);

      // Place cursor inside the span
      const newRange = document.createRange();
      newRange.setStart(span.firstChild!, 1);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    // Update content
    handleContentChange();
    if (editorRef.current) {
      saveToHistory(editorRef.current.innerHTML);
    }
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleInput = () => {
      handleContentChange();
      saveToHistory(editor.innerHTML);
    };

    editor.addEventListener("input", handleInput);
    return () => editor.removeEventListener("input", handleInput);
  }, [handleContentChange, saveToHistory]);

  const [currentFontSize, setCurrentFontSize] = useState<string>("normal");

  const detectFontSizeFromSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node = selection.focusNode;
    if (node?.nodeType === 3) node = node.parentElement; // Text node to element

    while (node && node !== editorRef.current) {
      const element = node as HTMLElement; // Cast to HTMLElement
      if (element.style?.fontSize) {
        const pxValue = parseInt(element.style.fontSize, 10);
        if (pxValue <= 12) setCurrentFontSize("small");
        else if (pxValue <= 16) setCurrentFontSize("normal");
        else setCurrentFontSize("large");
        return;
      }
      node = node.parentElement;
    }

    // If nothing matched within editor, reset to default
    setCurrentFontSize("normal");
  };
  useEffect(() => {
    const handler = () => {
      setTimeout(() => detectFontSizeFromSelection(), 100); // Add delay
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

  const [listPopoverOpen, setListPopoverOpen] = useState(false);
  const applyAlphaList = () => {
    execCommand("insertOrderedList");

    // Ensure DOM is updated first
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection || !selection.anchorNode) return;

      const node = selection.anchorNode;
      const list = (
        node instanceof Element ? node : node?.parentElement
      )?.closest("ol");

      if (list) {
        console.log("[applyAlphaList] Found <ol>, applying alpha style");

        // Force override using inline style + !important
        list.style.setProperty("list-style-type", "lower-alpha", "important");
        list.style.setProperty("margin-left", "1.25rem");
        list.style.setProperty("padding-left", "1rem");
      } else {
        console.warn("[applyAlphaList] No <ol> found");
      }
    });
  };

  const [currentListType, setCurrentListType] = useState<
    "ul" | "ol" | "alpha" | null
  >(null);
  const getListIcon = () => {
    switch (currentListType) {
      case "ul":
        return <List size={18} />;
      case "ol":
        return <ListOrdered size={18} />;
      case "alpha":
        return <AbcListIcon size={18} />;
      default:
        return <List size={18} />; // Default icon
    }
  };

  // Add this function to detect if selection is in a list
  const detectListFromSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setCurrentListType(null);
      return;
    }

    const range = selection.getRangeAt(0);
    let node =
      range.startContainer.nodeType === 3
        ? range.startContainer.parentElement
        : range.startContainer;

    // Check if we're within the editor
    let isWithinEditor = false;
    let currentNode = node;
    while (currentNode) {
      if (currentNode === editorRef.current) {
        isWithinEditor = true;
        break;
      }
      currentNode = currentNode.parentElement;
    }

    if (!isWithinEditor) {
      setCurrentListType(null);
      return;
    }

    // Look for list elements in the selection's ancestry
    while (node && node !== editorRef.current) {
      if (node instanceof Element) {
        if (node.tagName === "UL") {
          setCurrentListType("ul");
          return;
        } else if (node.tagName === "OL") {
          // Check if it's alphabetical or numeric
          const listStyle = window.getComputedStyle(node).listStyleType;
          if (listStyle === "lower-alpha" || listStyle === "upper-alpha") {
            setCurrentListType("alpha");
          } else {
            setCurrentListType("ol");
          }
          return;
        }
        node = node.parentElement;
      } else {
        break;
      }
    }

    // No list found
    setCurrentListType(null);
  };

  // Update your useEffect to include list detection
  useEffect(() => {
    const handler = () => {
      detectFontSizeFromSelection();
      detectListFromSelection(); // Add this line
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

  //change font colors:
  const [highlightColor, setHighlightColor] = useState("#ffff");
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightColorPicker, setShowHighlightColorPicker] =
    useState(false);

  const applyTextColor = (color: string | undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    // Restore saved selection
    if (savedSelection) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
      }
    }

    document.execCommand("foreColor", false, color);
    // textColor(color);
    setShowTextColorPicker(false);
  };

  const applyHighlight = (color: string | undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    if (savedSelection) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
      }
    }

    if (color) {
      document.execCommand("backColor", false, color);
      setHighlightColor(color); // This works because color is guaranteed to be a string here
    }

    setShowHighlightColorPicker(false);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      if (showTextColorPicker || showHighlightColorPicker) {
        setShowTextColorPicker(false);
        setShowHighlightColorPicker(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showTextColorPicker, showHighlightColorPicker]);

  return (
    <div className="flex flex-col ">
      {/* Label OUTSIDE of the editor box */}
      {label && (
        <LabelText
          required={required}
          htmlFor="editor"
          className="!text-xs md:!text-sm mb-(-2px)C"
        >
          {label}
        </LabelText>
      )}
      <div className="bg-white rounded-lg overflow-hidden border">
        {/* Toolbar */}
        <div className="bg-white border-b p-2 flex flex-wrap items-center gap-1 ">
          {/* Text Format Dropdown */}
          <select
            value={currentFontSize}
            onChange={(e) => {
              const sizeMap = {
                small: 12,
                normal: 16,
                large: 24,
              };

              const selectedSize =
                sizeMap[e.target.value as keyof typeof sizeMap];
              if (selectedSize) {
                setFontSize(selectedSize);
                setCurrentFontSize(e.target.value);
              }
            }}
            className="bg-white text-black px-1 py-1 rounded text-xs border border-gray-300 w-24"
            title="Font Size"
            style={{
              fontSize: "14px", // Keep the select itself readable
            }}
          >
            <option value="small" style={{ fontSize: "12px" }}>
              Small
            </option>
            <option value="normal" style={{ fontSize: "16px" }}>
              Normal
            </option>
            <option value="large" style={{ fontSize: "24px" }}>
              Large
            </option>
          </select>

          {/* Text Formatting */}
          <button
            onClick={() => execCommand("bold")}
            className={buttonClasses(activeFormats.bold)}
            title="Bold"
          >
            <Bold size={16} />
          </button>

          <button
            onClick={() => execCommand("italic")}
            className={buttonClasses(activeFormats.italic)}
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => execCommand("underline")}
            className={buttonClasses(activeFormats.underline)}
            title="Underline (Ctrl+U)"
          >
            <Underline size={16} />
          </button>

          <div className="relative">
            <button
              onClick={() => setAlignmentPopoverOpen((prev) => !prev)}
              className={buttonClasses(true)}
              title="Text Alignment"
            >
              {currentAlign === "left" && <AlignLeft size={16} />}
              {currentAlign === "center" && <AlignCenter size={16} />}
              {currentAlign === "right" && <AlignRight size={16} />}
            </button>

            {alignmentPopoverOpen && (
              <div className="absolute bg-white shadow-lg rounded-[4px] border mt-[0.5px] z-[9999] w-fit">
                <button
                  className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 w-full text-left"
                  onClick={() => applyAlignment("left")}
                >
                  <AlignLeft size={16} />
                </button>
                <button
                  className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 w-full text-left"
                  onClick={() => applyAlignment("center")}
                >
                  <AlignCenter size={16} />
                </button>
                <button
                  className="flex fitems-center gap-2 px-2 py-1 hover:bg-gray-100 w-full text-left"
                  onClick={() => applyAlignment("right")}
                >
                  <AlignRight size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setListPopoverOpen((prev) => !prev)}
              className={buttonClasses(currentListType !== null)} // Only gray when actually in a list
              title="List Options"
            >
              {getListIcon()}
            </button>

            {listPopoverOpen && (
              <div className="absolute bg-white shadow-lg rounded-[4px] border mt-[0.5px] z-[9999] w-fit">
                <button
                  className="flex items-center gap-2 px-2 py-1 hover:bg-gray w-full text-left"
                  onClick={() => {
                    execCommand("insertUnorderedList");
                    setCurrentListType("ul");
                    setListPopoverOpen(false);
                  }}
                >
                  <List size={24} />
                </button>

                <button
                  className="flex items-center gap-2 px-2 py-1 hover:bg-gray w-full text-left"
                  onClick={() => {
                    execCommand("insertOrderedList");
                    setCurrentListType("ol");
                    setListPopoverOpen(false);
                  }}
                >
                  <ListOrdered size={24} />
                </button>

                <button
                  className="flex items-center gap-2 px-3 py-1 hover:bg-gray w-full text-left "
                  onClick={() => {
                    applyAlphaList();
                    setCurrentListType("alpha");
                    setListPopoverOpen(false);
                  }}
                >
                  <AbcListIcon size={24} />
                </button>
              </div>
            )}
          </div>

          {/* Upload File Button */}
          <button
            onClick={handleFileButtonClick} // ✅ Use this instead
            className={buttonClasses(false)}
            title="Upload File"
          >
            <Paperclip size={16} />
          </button>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange} // ✅ Use the new function here
            className="hidden"
          />
          {/* Insert Link */}
          <button
            onClick={insertLink}
            className={buttonClasses(false)}
            title="Insert Link"
          >
            <Link size={16} />
          </button>
          <button
            ref={emojiButtonRef}
            onMouseDown={(e) => {
              e.preventDefault(); // This stops the button from taking focus away from editor
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowPicker(!showPicker);
            }}
            className={buttonClasses(false)}
            title="Insert Emoji"
          >
            <Smile size={16} />
          </button>

          {showPicker && (
            <div
              className="fixed bg-white shadow-lg rounded-md border"
              style={{
                top: pickerPosition.top,
                right: pickerPosition.top,
                zIndex: 9999,
                pointerEvents: "auto",
                maxHeight: "400px",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                width={300}
                height={300}
                theme={Theme.LIGHT}
                previewConfig={{ showPreview: false }}
                skinTonesDisabled={true}
                style={{ fontSize: 8 }}
              />
            </div>
          )}

          {/* <button
                onClick={handleGoogleDriveLink}
                className={buttonClasses(false)}
                title="Insert Google Drive Link"
            >
            <Link2 size={16} />
            </button> */}
          {/* Insert Image */}
          {/* <button
                onClick={insertImageFromFile}
                className={buttonClasses(activeFormats.imageIcon)}
                title="Insert Image"
            >
                <Image size={16} />
            </button> */}

          {/* signature tool */}
          <button
            onClick={() => setModalOpen(true)}
            className={buttonClasses(false)}
            title="Insert Signature"
          >
            <PenTool size={16} />
          </button>

          {/* Modal for Drawing Signature */}
          <Modal
            isOpen={modalOpen}
            onRequestClose={() => setModalOpen(false)}
            className="bg-white p-6 rounded shadow-md w-[320px] mx-auto mt-20 z-50"
            overlayClassName="fixed inset-0 bg-transparent flex justify-center items-start"
            ariaHideApp={false}
            style={{
              content: { zIndex: 9999 },
              overlay: { zIndex: 9998 },
            }}
          >
            <h2 className="text-lg font-semibold mb-2">Draw your signature</h2>

            <div className="pointer-events-auto z-[1002]">
              <ReactSketchCanvas
                ref={canvasRef}
                strokeWidth={2}
                strokeColor="black"
                style={{
                  height: 180, // crucial!
                  width: "100%",
                  borderRadius: 4,
                  border: "1px solid #ccc",
                }}
              />

              <div className=" pt-3">
                <ActionButtons
                  onCancel={() => setModalOpen(false)}
                  onSubmit={insertSignature}
                  secondaryBtnText="Cancel"
                  parimeryBtnText="Insert"
                  isClose
                />
              </div>
            </div>
          </Modal>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              setShowTextColorPicker(!showTextColorPicker);
              setShowHighlightColorPicker(false); // Close other picker
            }}
            className={buttonClasses(false)}
            title="Text Color"
            style={{ color: textColor }}
          >
            <Type size={16} />
          </button>

          {/* Highlight Button */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              setShowHighlightColorPicker(!showHighlightColorPicker);
              setShowTextColorPicker(false); // Close other picker
            }}
            className={buttonClasses(false)}
            title="Highlight Text"
            style={{ backgroundColor: highlightColor, opacity: 0.7 }}
          >
            <Highlighter size={16} />
          </button>

          {/* Text Color Picker */}
          {showTextColorPicker && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white shadow-lg rounded-md border p-3 z-50">
              {/* Gradient Color Wheel */}
              <div
                className="w-32 h-32 rounded-full cursor-crosshair relative mx-auto"
                style={{
                  background: `conic-gradient(
                    hsl(0, 100%, 50%),
                    hsl(60, 100%, 50%),
                    hsl(120, 100%, 50%),
                    hsl(180, 100%, 50%),
                    hsl(240, 100%, 50%),
                    hsl(300, 100%, 50%),
                    hsl(0, 100%, 50%)
                  )`,
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const centerX = rect.width / 2;
                  const centerY = rect.height / 2;
                  const x = e.clientX - rect.left - centerX;
                  const y = e.clientY - rect.top - centerY;

                  const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
                  const normalizedAngle = angle < 0 ? angle + 360 : angle;
                  const hue = Math.round(normalizedAngle);
                  const distance = Math.min(Math.sqrt(x * x + y * y), centerX);
                  const saturation = Math.round((distance / centerX) * 100);

                  const color = `hsl(${hue}, ${saturation}%, 50%)`;
                  applyTextColor(color);
                }}
              >
                {/* Center white circle for easier clicking */}
                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 border border-gray-300"></div>
              </div>

              {/* Quick preset colors below */}
              <div className="grid grid-cols-8 gap-1 mt-3">
                {[
                  "#000000",
                  "#ffffff",
                  "#ff0000",
                  "#00ff00",
                  "#0000ff",
                  "#ffff00",
                  "#ff00ff",
                  "#00ffff",
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => applyTextColor(color)}
                    className="w-5 h-5 border border-gray-300 cursor-pointer rounded"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Highlight Color Picker */}
          {showHighlightColorPicker && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white shadow-lg rounded-md border p-3 z-50">
              {/* Gradient Color Wheel for highlights */}
              <div
                className="w-32 h-32 rounded-full cursor-crosshair relative mx-auto"
                style={{
                  background: `conic-gradient(
                    hsl(0, 100%, 50%),
                    hsl(60, 100%, 50%),
                    hsl(120, 100%, 50%),
                    hsl(180, 100%, 50%),
                    hsl(240, 100%, 50%),
                    hsl(300, 100%, 50%),
                    hsl(0, 100%, 50%)
                  )`,
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const centerX = rect.width / 2;
                  const centerY = rect.height / 2;
                  const x = e.clientX - rect.left - centerX;
                  const y = e.clientY - rect.top - centerY;

                  const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
                  const normalizedAngle = angle < 0 ? angle + 360 : angle;
                  const hue = Math.round(normalizedAngle);
                  const distance = Math.min(Math.sqrt(x * x + y * y), centerX);
                  const saturation = Math.round((distance / centerX) * 70);

                  const color = `hsl(${hue}, ${saturation}%, 80%)`;
                  applyHighlight(color);
                }}
              >
                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 border border-gray-300"></div>
              </div>

              {/* Quick preset highlight colors */}
              <div className="grid grid-cols-8 gap-1 mt-3">
                {[
                  "#000000",
                  "#ffffff",
                  "#ff0000",
                  "#00ff00",
                  "#0000ff",
                  "#ffff00",
                  "#ff00ff",
                  "#00ffff",
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => applyHighlight(color)}
                    className="w-5 h-5 border border-gray-300 cursor-pointer rounded"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Editor - type your text here */}

        <div
          ref={editorRef}
          contentEditable
          className={`${styles.editorContent} max-h-32 p-4 outline-none overflow-y-auto overflow-x-hidden list-inside space-y-2`}
          suppressContentEditableWarning
          onMouseUp={() => {
            // Save cursor position whenever user clicks in editor
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              setSavedSelection(selection.getRangeAt(0).cloneRange());
            }
          }}
          onKeyUp={() => {
            // Save cursor position whenever user types
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              setSavedSelection(selection.getRangeAt(0).cloneRange());
            }
          }}
          style={{
            fontFamily: selectedFont,
            fontSize: selectedSize + "px",
            color: textColor,
            minHeight: containerMinheight,
            maxHeight: containerMaxheight,
            listStyleType: "disc",
            wordBreak: "break-word",
            whiteSpace: "normal",
            width: "100%",
            left: "100px",
          }}
        >
          <p>
            <br />
          </p>
        </div>
      </div>
    </div>
  );
};

export default TextEditor;

// ---------------------------------------- ---------------------------------------- ------------------------------
const AbcListIcon = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10 10"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    <text
      x="0"
      y="5"
      fontSize="4"
      fontWeight="bold"
      fontFamily="sans-serif"
      fill="currentColor"
    >
      a
    </text>
    <text
      x="6"
      y="5"
      fontSize="4"
      fontWeight="bold"
      fontFamily="sans-serif"
      fill="currentColor"
    >
      –
    </text>
    <text
      x="0"
      y="9"
      fontSize="4"
      fontWeight="bold"
      fontFamily="sans-serif"
      fill="currentColor"
    >
      b
    </text>
    <text
      x="6"
      y="9"
      fontSize="4"
      fontWeight="bold"
      fontFamily="sans-serif"
      fill="currentColor"
    >
      –
    </text>
  </svg>
);
