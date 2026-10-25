import React, { useMemo } from "react";
import Linkify from "react-linkify";

const MessageHistory = ({ messages, loggedInUserId }) => {
  const memoizedMessages = useMemo(() => {
    return messages.map((msg, index) => (
      <div
        key={index}
        className={`message ${msg.senderId._id === loggedInUserId ? "text-right" : "text-left"}`}
      >
        <div
          className={`flex items-center space-x-2 ${msg.senderId._id === loggedInUserId ? "flex-row-reverse" : ""}`}
        >
          <p
            className={`text-sm ${msg.senderId._id === loggedInUserId ? "bg-slate-800 text-white" : "bg-gray-200 text-black"}p-3 rounded-lg max-w-full sm:max-w-xs`}
          >
            <strong>{msg.senderName}:</strong>
            <span className="block mt-1">{msg.content}</span>

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
    ));
  }, [messages, loggedInUserId]);

  return (
    <div className="message-history overflow-y-scroll h-[calc(100vh-200px)] mb-4 p-4 space-y-4">
      {memoizedMessages}
    </div>
  );
};

export default MessageHistory;
