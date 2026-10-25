// src/components/chat/MessageHistory.jsx
import React from "react";
import Linkify from "react-linkify";

const MessageHistory = ({ messages, loggedInUserId }) => {
  return (
    <div className="message-history overflow-y-scroll h-[60dvh] md:h-[calc(100vh-200px)] mb-4 p-4 space-y-4">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`message ${msg.senderId._id === loggedInUserId ? "text-right" : "text-left"}`}
        >
          <div
            className={`flex flex-col sm:flex-row items-start sm:items-center space-x-0 sm:space-x-2 ${msg.senderId._id === loggedInUserId ? "sm:flex-row-reverse" : ""}`}
          >
            <p
              className={`text-sm ${msg.senderId._id === loggedInUserId ? "bg-slate-800 text-white" : "bg-gray-200 text-black"}p-3 rounded-lg max-w-full sm:max-w-xs`}
            >
              <strong>{msg.senderName}:</strong>
              <span className="block mt-1">{msg.content}</span>

              {/* Display the link if provided */}
              {msg.link && (
                <a
                  href={msg.link}
                  target="_blank"
                  className="text-slate-700 hover:text-slate-700 underline mt-2 block"
                >
                  {msg.link}
                </a>
              )}
            </p>
          </div>

          {/* Display media preview */}
          {msg.mediaUrl && (
            <div className="mt-2">
              {msg.mediaType === "image" && (
                <img
                  src={msg.mediaUrl}
                  alt="Media"
                  className="max-w-full sm:max-w-[300px] rounded-lg shadow-lg mt-2"
                />
              )}
              {msg.mediaType === "video" && (
                <video
                  controls
                  className="max-w-full sm:max-w-[300px] rounded-lg shadow-lg mt-2"
                >
                  <source src={msg.mediaUrl} />
                </video>
              )}
              {msg.mediaType === "audio" && (
                <audio controls className="w-full sm:w-auto mx-auto mt-2">
                  <source src={msg.mediaUrl} />
                </audio>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MessageHistory;
