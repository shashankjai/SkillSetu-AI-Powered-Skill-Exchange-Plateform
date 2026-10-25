// src/components/chat/MessageInput.jsx
import React, { useState } from "react";
import { FaPaperPlane } from "react-icons/fa";
import { AiOutlineLink } from "react-icons/ai";
import { FiX } from "react-icons/fi"; // Red cross icon

const MessageInput = ({ sendMessage, disabled = false }) => {
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const fileInputRef = React.createRef(); // Reference to file input

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const filePreviewUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(filePreviewUrl); // Create the preview URL
    }
  };

  const handleLinkChange = (e) => {
    setLink(e.target.value);
  };

  const handleAttachLink = () => {
    setShowLinkInput(true); // Show the link input field
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null); // Remove file preview
    fileInputRef.current.value = ""; // Clear the file input field
  };

  const handleSendMessage = () => {
    if (disabled) return;
    if (message.trim() === "" && !file && !link) {
      console.log("No message, file, or link to send");
      return; // Exit early if no message, file, or link
    }

    // Format the link by ensuring it starts with "http://" or "https://"
    let finalMessage = message;

    if (link) {
      // If the link does not start with "http://" or "https://", add "http://"
      const formattedLink =
        !link.startsWith("http://") && !link.startsWith("https://")
          ? `http://${link}`
          : link;

      // Convert the entered link to a clickable hyperlink
      finalMessage += ` <a href="${formattedLink}" target="_blank" rel="noopener noreferrer">${formattedLink}</a>`;

      // Update the link state after formatting
      setLink(formattedLink);
    }

    // Send both the message and the link separately
    sendMessage(finalMessage, file, link);

    // Clear inputs after sending
    setMessage("");
    setLink("");
    setFile(null);
    setPreviewUrl(null);
    setShowLinkInput(false);
    fileInputRef.current.value = ""; // Clear the file input field
  };

  return (
    <div className="message-input flex w-full flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)]">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSendMessage();
          }
        }}
        placeholder="Type a message..."
        disabled={disabled}
        className="min-w-[100px] flex-1 rounded-lg border border-slate-300 bg-slate-100 p-2.5 text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 sm:min-w-[150px]"
      />

      <input
        ref={fileInputRef} // Attach reference here
        type="file"
        accept="image/*,video/*,audio/*"
        onChange={handleFileChange}
        className="max-w-[160px] w-full cursor-pointer rounded-lg border border-slate-300 bg-slate-100 p-2 text-sm text-slate-900 sm:w-auto"
      />

      {previewUrl && (
        <div className="preview mt-2 flex items-center">
          <div className="file-preview-container flex items-center mr-2">
            {file && file.type.startsWith("image") && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full sm:max-w-xs rounded-lg shadow-md"
              />
            )}
            {file && file.type.startsWith("video") && (
              <video
                src={previewUrl}
                controls
                className="max-w-full sm:max-w-xs rounded-lg shadow-md"
              />
            )}
            {file && file.type.startsWith("audio") && (
              <audio
                src={previewUrl}
                controls
                className="max-w-full sm:max-w-xs rounded-lg shadow-md"
              />
            )}
          </div>
          <button
            onClick={handleRemoveFile}
            className="ml-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition duration-300 ease-in-out"
          >
            <FiX className="text-white text-xl" />
          </button>
        </div>
      )}

      <button
        onClick={handleAttachLink}
        className="rounded-lg bg-slate-800 p-2 text-white transition duration-300 hover:bg-teal-700"
      >
        <AiOutlineLink className="text-white text-xl" />
      </button>
      {showLinkInput && (
        <input
          type="text"
          value={link}
          onChange={handleLinkChange}
          placeholder="Enter a URL"
          className="min-w-[150px] rounded-lg border border-slate-300 bg-slate-100 p-2 text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      )}

      <button
        onClick={handleSendMessage}
        disabled={disabled}
        aria-label={disabled ? "Sending message" : "Send message"}
        className="rounded-lg bg-slate-800 p-2 text-white transition duration-300 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FaPaperPlane className="text-white text-xl" />
      </button>
    </div>
  );
};

export default MessageInput;
