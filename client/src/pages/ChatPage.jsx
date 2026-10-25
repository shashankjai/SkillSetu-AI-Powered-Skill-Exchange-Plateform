import React, { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import Navbar from "../components/navbar/Navbar"; // Import Navbar
import MessageInput from "../components/chat/MessageInput"; // Import MessageInput
import { useNavigate, useParams } from "react-router-dom";
import { FiCalendar, FiClock } from "react-icons/fi";
import Footer from "../components/footer/Footer";
import Background from "../components/background/Background";
import VideoCallModal from "../components/video/VideoCallModal";
import "../components/background/Background.css";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
import { IoMdWarning } from "react-icons/io"; // Importing a warning icon for the button

const ChatPage = () => {
  const { sessionId } = useParams(); // Get sessionId from URL parameter
  const loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
  const [connections, setConnections] = useState([]); // List of connections
  const [selectedConnection, setSelectedConnection] = useState(null); // Selected connection for chat
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false); // Feedback Modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false); // Schedule Modal state
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [messages, setMessages] = useState([]); // List of messages in the current chat
  const [socket, setSocket] = useState(null); // Socket connection
  const [notificationSocket, setNotificationSocket] = useState(null); // Notification socket connection
  const [rating, setRating] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [reportSuccess, setReportSuccess] = useState(false); // State for success message
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [incomingCallRequest, setIncomingCallRequest] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const sendingMessageRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeVideoCall = useCallback(() => setIsVideoCallOpen(false), []);

  // Fetch accepted session connections
  useEffect(() => {
    const fetchConnections = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get(`${API_URL}/api/sessions/accepted`, {
          headers: { "x-auth-token": token },
        });
        setConnections(response.data);

        // If there is a sessionId in the URL, select that connection automatically
        if (sessionId) {
          const connection = response.data.find(
            (conn) => conn._id === sessionId,
          );
          setSelectedConnection(connection);
        }
      } catch (err) {
        console.error("Error fetching connections:", err);
      }
    };

    fetchConnections();
  }, [sessionId]);

  // Set up Socket.io connection for the selected session room
  useEffect(() => {
    const activeSessionId = sessionId || selectedConnection?._id;
    if (!activeSessionId) {
      console.error("Session ID is undefined.");
      return undefined;
    }

    const socketIo = io(`${API_URL}/sessions`, {
      transports: ["websocket"],
      query: { sessionId: activeSessionId },
    });

    socketIo.on("connect", () => {
      console.log("WebSocket connected:", socketIo.id);
      socketIo.emit("join-call", {
        sessionId: activeSessionId,
        userId: loggedInUser?._id,
      });
    });

    socketIo.on("receive_message", (data) => {
      console.log("Received message:", data);

      if (data.sender && data.receiver) {
        setMessages((prevMessages) => {
          if (data._id && prevMessages.some((message) => String(message._id) === String(data._id))) {
            return prevMessages;
          }
          return [...prevMessages, {
            ...data,
            senderName: data.sender.name,
            receiverName: data.receiver.name,
          }];
        });
      }
    });

    socketIo.on("video-call-request", (data) => {
      if (!data || !data.senderId || data.senderId === loggedInUser?._id) {
        return;
      }
      setIncomingCallRequest(data);
    });

    socketIo.on("video-call-accepted", (data) => {
      if (!data || !data.acceptedBy || data.acceptedBy === loggedInUser?._id) {
        return;
      }
      setIncomingCallRequest(null);
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
      setSocket(null);
    };
  }, [sessionId, selectedConnection?._id, loggedInUser?._id]);

  useEffect(() => {
    const timeRefresh = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timeRefresh);
  }, []);

  // Set up the **Notification Socket.io connection** (separate from the chat socket)
  useEffect(() => {
    const socketIoNotification = io(`${API_URL}/notifications`, {
      transports: ["websocket"],
    });

    socketIoNotification.on("connect", () => {
      console.log("Notification WebSocket connected:", socketIoNotification.id);
    });

    setNotificationSocket(socketIoNotification);

    // Subscribe the user to notifications (you need to pass the userId from localStorage)
    const userId = JSON.parse(localStorage.getItem("user"))._id;
    socketIoNotification.emit("subscribeToNotifications", userId);

    return () => {
      socketIoNotification.disconnect();
    };
  }, []);

  // Fetch messages for the selected connection
  useEffect(() => {
    if (selectedConnection) {
      const fetchMessages = async () => {
        const token = localStorage.getItem("token");
        try {
          const response = await axios.get(
            `${API_URL}/api/sessions/message/${selectedConnection._id}`,
            {
              headers: { "x-auth-token": token },
            },
          );

          const updatedMessages = response.data.map((msg) => ({
            ...msg,
            senderName: msg.senderId?.name || "Unknown",
            receiverName: msg.receiverId?.name || "Unknown",
          }));

          // Preserve messages that arrived over the socket while this history request
          // was in flight, and merge on database ID to avoid losing or duplicating them.
          setMessages((currentMessages) => {
            const merged = new Map();
            [...updatedMessages, ...currentMessages].forEach((message, index) => {
              const key = message._id ? String(message._id) : `pending-${index}`;
              merged.set(key, message);
            });
            return [...merged.values()].sort(
              (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
            );
          });
        } catch (err) {
          console.error("Error fetching messages:", err);
        }
      };

      fetchMessages();
    }
  }, [selectedConnection]);

  // Handle selecting a connection for chat
  const handleSelectConnection = (connection) => {
    setSelectedConnection(connection);
    navigate(`/chat/${connection._id}`); // Navigate to the chat page with selected sessionId
  };

  // Send a message
  const handleSendMessage = (message, file) => {
    if (sendingMessageRef.current) return Promise.resolve();
    if (
      selectedConnection?.status === "completed" ||
      selectedConnection?.status === "canceled"
    ) {
      alert("You cannot send messages for completed or canceled sessions.");
      return;
    }

    console.log("Message to send:", message); // Debugging: log the message
    console.log("File to send:", file); // Debugging: log the file

    if (message.trim() === "" && !file) {
      console.log("No message or file to send"); // Debugging: log when no message or file
      return;
    }

    // Guard synchronously so rapid repeated clicks cannot create duplicate messages.
    sendingMessageRef.current = true;
    setIsSendingMessage(true);

    const token = localStorage.getItem("token");
    const userData = JSON.parse(localStorage.getItem("user"));

    const formData = new FormData();
    formData.append("sessionId", selectedConnection._id); // Ensure sessionId is correctly included
    formData.append("content", message); // Append message content

    if (file) {
      formData.append("file", file); // Append file if available
      console.log("File appended to FormData:", file); // Debugging: log file data
    }

    // Store the message in the backend; Socket.IO chat is already scoped by session room
    // on the backend for receive_message distribution.
    return axios
      .post(`${API_URL}/api/sessions/message`, formData, {
        headers: { "x-auth-token": token },
      })
      .then((response) => {
        console.log("Message sent successfully:", response.data);
      })
      .catch((err) => {
        console.error("Error sending message:", err.response || err);
      })
      .finally(() => {
        sendingMessageRef.current = false;
        setIsSendingMessage(false);
      });
  };

  // Open schedule modal
  const openScheduleModal = () => {
    setIsScheduleModalOpen(true); // Open schedule modal
  };

  // Close schedule modal
  const closeScheduleModal = () => {
    setIsScheduleModalOpen(false); // Close schedule modal
  };

  // Open feedback modal
  const openFeedbackModal = () => {
    setIsFeedbackModalOpen(true); // Open feedback modal
  };

  // Close feedback modal
  const closeFeedbackModal = () => {
    setIsFeedbackModalOpen(false); // Close feedback modal
  };

  // Schedule session (send API request to backend)
  const handleScheduleSession = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.post(
        `${API_URL}/api/sessions/schedule`,
        {
          sessionId,
          newMeetingDate: scheduledDate,
          newMeetingTime: scheduledTime,
        },
        { headers: { "x-auth-token": token } },
      );

      closeScheduleModal();
    } catch (error) {
      console.error("Error scheduling session:", error);
    }
  };

  // Handle marking session as completed or canceled
  const handleMarkSession = async (status) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("Token is missing");
        return;
      }

      if (!feedback) {
        alert("Please provide feedback before marking the session.");
        return;
      }

      console.log(`Marking session as ${status}`);

      await axios.post(
        `${API_URL}/api/sessions/mark-session`,
        {
          sessionId,
          status,
          rating,
          feedback,
        },
        {
          headers: {
            "x-auth-token": token, // Ensure the token is being sent correctly
          },
        },
      );
      console.log("Session marked successfully");

      setIsFeedbackModalOpen(false); // Close feedback modal after submission
      // Refresh session data to update the status
      const updatedSession = await axios.get(
        `${API_URL}/api/sessions/accepted`,
        {
          headers: {
            "x-auth-token": token, // Pass token for the session data request as well
          },
        },
      );
      setSelectedConnection(
        updatedSession.data.find((session) => session._id === sessionId),
      );
    } catch (error) {
      console.error("Error marking session:", error);
    }
  };

  // Open/close Report Modal
  const openReportModal = () => {
    setIsReportModalOpen(true);
    setReportSuccess(false); // Reset success state when opening the modal
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
  };

  // Handle Report Submit
  const handleReportSubmit = async (e) => {
    e.preventDefault(); // Prevent the default form submit behavior

    // Retrieve the logged-in user from localStorage
    const loggedInUser = JSON.parse(localStorage.getItem("user"));

    // if (!loggedInUser || !loggedInUser._id) {
    //   alert('Invalid user. Please log in again.');
    //   return; // Stop the submission if no valid user is found
    // }

    // Get sessionId from the selected connection
    const sessionId = selectedConnection._id;

    // Determine the targetUser from the session
    const targetUser =
      selectedConnection.userId1._id === loggedInUser._id
        ? selectedConnection.userId2._id
        : selectedConnection.userId1._id;

    if (!targetUser || !sessionId) {
      alert("Invalid session or target user.");
      return; // Stop the submission if target user or session is missing
    }

    const formData = new FormData();
    formData.append("reason", reason);
    formData.append("description", description);
    formData.append("reporter", loggedInUser._id); // Include the logged-in user as the reporter
    formData.append("targetUser", targetUser); // Include the target user
    formData.append("session", sessionId); // Include the session ID

    if (screenshot) {
      formData.append("screenshot", screenshot); // Attach screenshot if available
    }

    const token = localStorage.getItem("token");

    try {
      const response = await axios.post(`${API_URL}/api/reports`, formData, {
        headers: { "x-auth-token": token },
      });

      // Success: Reset form and show success message
      alert("Report submitted successfully");
      setReason("");
      setDescription("");
      setScreenshot(null);
      closeReportModal();
    } catch (error) {
      console.error("Error submitting report:", error);
      alert(
        "Error submitting report: " +
          (error.response?.data?.message || error.message),
      );
    }
  };

  // Check if the logged-in user is user1 or user2 in the current session
  const isUser1 = selectedConnection?.userId1?._id === loggedInUser?._id;
  const isUser2 = selectedConnection?.userId2?._id === loggedInUser?._id;

  // Check if feedback has been given by the logged-in user
  const isFeedbackGivenByLoggedInUser = isUser1
    ? selectedConnection?.feedbackByUser1 // Assuming these fields contain the feedback for user1
    : isUser2
      ? selectedConnection?.feedbackByUser2 // Assuming these fields contain the feedback for user2
      : false; // If neither, feedback hasn't been provided by the logged-in user

  // Check if both users have provided feedback
  const bothUsersProvidedFeedback =
    selectedConnection?.feedbackByUser1 && selectedConnection?.feedbackByUser2;

  // Check if session is completed or canceled
  const isSessionCompletedOrCanceled =
    selectedConnection?.status === "completed" ||
    selectedConnection?.status === "canceled";

  // Disable interaction if the session is completed or canceled and both users have provided feedback
  const isChatBlocked =
    isSessionCompletedOrCanceled && bothUsersProvidedFeedback;

  // Show the feedback modal if the logged-in user hasn't provided feedback yet
  const shouldShowFeedbackModal =
    !isFeedbackGivenByLoggedInUser && !isChatBlocked;

  // Show "Schedule Next Meeting" only if the session is not completed or canceled and both users haven't provided feedback
  const shouldShowScheduleButton =
    !isSessionCompletedOrCanceled && !bothUsersProvidedFeedback;

  // Left Panel: List of Connections
  const getOtherUserName = (connection) => {
    if (!connection) return "Unknown"; // Check if connection is null or undefined
    const user1Name = connection.userId1?.name || "Unknown"; // Safe access to name
    const user2Name = connection.userId2?.name || "Unknown"; // Safe access to name
    return connection.userId1?._id === loggedInUser._id ? user2Name : user1Name;
  };

  // Right Panel: Chat with Selected Connection
  const getChatUserName = () => {
    if (
      !selectedConnection ||
      !selectedConnection.userId1 ||
      !selectedConnection.userId2
    ) {
      return "Unknown"; // Return a fallback value if selectedConnection or its properties are null
    }

    const user1Name = selectedConnection.userId1?.name || "Unknown"; // Safe access to name
    const user2Name = selectedConnection.userId2?.name || "Unknown"; // Safe access to name
    return selectedConnection.userId1._id === loggedInUser._id
      ? user2Name
      : user1Name;
  };

  // Utility function to format the date to a more readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(); // This will display the date in a format like "MM/DD/YYYY"
  };

  const getSessionStartDateTime = (session) => {
    if (!session) return null;

    const sessionDate = session.newMeetingDate || session.sessionDate;
    const sessionTime = session.newMeetingTime || session.sessionTime;

    if (!sessionDate || !sessionTime) return null;

    const dateOnly = new Date(sessionDate).toISOString().slice(0, 10);
    const sessionDateTime = new Date(`${dateOnly}T${sessionTime}`);
    return Number.isNaN(sessionDateTime.getTime()) ? null : sessionDateTime;
  };

  const canStartVideoCall =
    selectedConnection &&
    selectedConnection.status === "accepted" &&
    getSessionStartDateTime(selectedConnection) &&
    getSessionStartDateTime(selectedConnection) <= currentTime;

  const handleStartVideoCall = () => {
    if (!socket || !selectedConnection?._id || !loggedInUser?._id) return;

    socket.emit("video-call-request", {
      sessionId: selectedConnection._id,
      senderId: loggedInUser._id,
      senderName: loggedInUser.name || "User",
    });

    setIsVideoCallOpen(true);
  };

  const handleAcceptVideoCall = () => {
    if (!socket || !selectedConnection?._id || !loggedInUser?._id) return;

    socket.emit("video-call-accepted", {
      sessionId: selectedConnection._id,
      senderId: incomingCallRequest?.senderId,
      acceptedBy: loggedInUser._id,
    });

    setIncomingCallRequest(null);
    setIsVideoCallOpen(true);
  };

  return (
    <div className="min-h-dvh relative overflow-x-hidden bg-[#FFFEFC] text-slate-900 flex flex-col font-sans">
      <Background />
      <div className="chat-page flex min-h-dvh flex-col overflow-x-hidden bg-[#FFFEFC] text-slate-900">
        <Navbar />
        <div className="flex flex-1 flex-col md:flex-row">
          <button
            className="md:hidden fixed top-4 left-4 z-50 rounded-xl bg-slate-800 p-2 text-white shadow-lg"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            ☰
          </button>
          {/* Left Panel: List of Connections */}
          <div
            className={`left-panel fixed z-40 top-0 bottom-0 left-0 w-3/4 sm:w-2/4 md:w-1/4 min-h-dvh border-r border-slate-200 bg-white p-6 shadow-2xl transition-transform duration-300 ease-in-out ${isMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:block`}
          >
            <h2 className="text-xl font-bold text-slate-900">Connections</h2>
            <div className="mt-4 max-h-[80dvh] space-y-2.5 overflow-auto pr-1">
              {connections.length > 0 ? (
                connections.map((connection) => {
                  const isSelected =
                    selectedConnection &&
                    selectedConnection._id === connection._id;
                  return (
                    <div
                      key={connection._id}
                      className={`cursor-pointer rounded-xl border p-3.5 transition duration-150 ${
            isSelected
              ? "border-slate-300 bg-slate-800 text-white shadow-md"
              : "border-slate-200 bg-slate-100/60 hover:border-slate-200 hover:bg-slate-100"
          }`}
                      onClick={() => handleSelectConnection(connection)}
                    >
                      <p className="font-bold text-sm">
                        {getOtherUserName(connection)}
                      </p>
                      <p className="text-xs text-slate-700 mt-0.5">
                        Skill: {connection.skill || "Skill Exchange"}
                      </p>
                      <p>
                        {formatDate(connection.sessionDate)} at{" "}
                        {connection.sessionTime}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-700">No connections available.</p>
              )}
            </div>
          </div>
          {/* Right Panel: Chat with Selected Connection */}
          <div className="chat-container min-h-dvh w-full overflow-hidden rounded-xl border border-slate-200 bg-[#FFFEFC]/70 p-2 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)] md:ml-0 md:flex-1 md:p-6">
            {selectedConnection && (
              <>
                <h2 className="mb-4 text-3xl font-semibold text-slate-900">
                  Chat with {getChatUserName()}
                </h2>
                <p className="text-slate-900">
                  Skill: {selectedConnection.skill || "Eclipse OCL"}
                </p>
                <div className="messages-container mb-6 max-h-[55dvh] overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-inner shadow-slate-900/10 md:max-h-[65dvh]">
                  {messages.length > 0 ? (
                    messages.map((msg, index) => {
                      const senderId = msg.senderId?._id || msg.senderId || msg.sender?.id;
                      const isOwnMessage = String(senderId) === String(loggedInUser?._id);

                      return (
                        <div
                          key={msg._id || index}
                          className={`message mb-4 flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[88%] rounded-2xl border p-4 text-slate-900 shadow-md backdrop-blur-sm sm:max-w-[75%] ${
                              isOwnMessage
                                ? "border-sky-300/80 bg-sky-200/75"
                                : "border-slate-300 bg-white/90"
                            }`}
                          >
                            <p className={isOwnMessage ? "text-right" : "text-left"}>
                              <strong>{msg.senderName}: </strong>
                              <span dangerouslySetInnerHTML={{ __html: msg.content }} />
                            </p>
                            {msg.mediaType === "image" && (
                              <img src={msg.mediaUrl} alt="file" className="mt-2 max-w-full rounded-lg sm:max-w-xs" />
                            )}
                            {msg.mediaType === "audio" && (
                              <audio controls className="w-full sm:w-auto">
                                <source src={msg.mediaUrl} />
                              </audio>
                            )}
                            {msg.mediaType === "video" && (
                              <video controls className="mt-2 max-w-full rounded-lg sm:max-w-xs">
                                <source src={msg.mediaUrl} />
                              </video>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-slate-600">No messages yet</p>
                  )}
                </div>

                {/* Feedback Display if session is completed or canceled */}
                {isSessionCompletedOrCanceled && (
                  <div className="feedback-display mb-6 rounded-2xl border border-slate-200 bg-slate-900/[0.04] p-4 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)]">
                    <h3 className="font-semibold text-slate-700">
                      Feedback from User 1:
                    </h3>
                    <p className="text-slate-900">
                      {selectedConnection?.feedbackByUser1}
                    </p>

                    <h3 className="mt-4 font-semibold text-slate-700">
                      Feedback from User 2:
                    </h3>
                    <p className="text-slate-900">
                      {selectedConnection?.feedbackByUser2}
                    </p>
                  </div>
                )}

                {/* Prevent sending messages if the session is completed or canceled */}
                {!isChatBlocked && (
                  <MessageInput sendMessage={handleSendMessage} disabled={isSendingMessage} />
                )}

                {incomingCallRequest && (
                  <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700">
                    <p>
                      <strong>
                        {incomingCallRequest.senderName || "Peer"}
                      </strong>{" "}
                      wants to start a video call.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleAcceptVideoCall}
                        className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white hover:bg-emerald-400"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setIncomingCallRequest(null)}
                        className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-900 hover:bg-slate-900/[0.04]"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Buttons Row */}
                <div className="flex flex-wrap justify-center items-center gap-4 mt-4">
                  {/* Start Video Call Button */}
                  {selectedConnection && (
                    <button
                      onClick={handleStartVideoCall}
                      disabled={!canStartVideoCall}
                      className={`px-4 py-2 rounded-lg font-semibold text-white shadow-lg transition duration-300 ease-in-out ${
                        canStartVideoCall
                          ? "bg-slate-900 text-white hover:bg-teal-700"
                          : "bg-slate-500/60 cursor-not-allowed"
                      }`}
                    >
                      {canStartVideoCall
                        ? "Start Video Call"
                        : "Video call opens when the session time starts"}
                    </button>
                  )}

                  {/* Schedule Next Meeting Button */}
                  {shouldShowScheduleButton && (
                    <button
                      onClick={openScheduleModal}
                      className="bg-slate-800 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-full flex items-center gap-2 transition duration-300 ease-in-out active:scale-[0.97]"
                    >
                      <FiCalendar /> Schedule Next Meeting
                    </button>
                  )}

                  {/* Mark as Completed */}
                  {!isChatBlocked && !isSessionCompletedOrCanceled && (
                    <>
                      <button
                        onClick={() => handleMarkSession("completed")}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition duration-300 ease-in-out"
                      >
                        Mark as Completed
                      </button>

                      {/* Mark as Canceled */}
                      <button
                        onClick={() => handleMarkSession("canceled")}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition duration-300 ease-in-out"
                      >
                        Mark as Canceled
                      </button>
                    </>
                  )}

                  {/* Report User Button */}
                  <button
                    onClick={openReportModal}
                    className="flex items-center gap-2 py-2 px-4 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition duration-200"
                  >
                    <IoMdWarning className="text-xl" />
                    <span>Report User</span>
                  </button>

                  {/* Feedback Button */}
                  {!isChatBlocked && !bothUsersProvidedFeedback && (
                    <button
                      onClick={openFeedbackModal}
                      className="bg-slate-800 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-full transition duration-300 ease-in-out active:scale-[0.97]"
                    >
                      Provide Feedback
                    </button>
                  )}

                  {isMenuOpen && (
                    <div
                      className="fixed inset-0 z-30 bg-black/40 md:hidden"
                      onClick={() => setIsMenuOpen(false)}
                    ></div>
                  )}

                  {/* Close Button */}
                  {/* Feedback Modal (only show if feedback hasn't been given yet) */}
                  {isFeedbackModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FFFEFC]/70">
                      <div className="w-[90%] max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-2xl">
                        <button
                          onClick={closeFeedbackModal}
                          className="absolute right-4 top-3 text-2xl text-slate-700 transition hover:text-slate-900"
                        >
                          &times;
                        </button>

                        <h3 className="text-2xl font-bold mb-5 text-center">
                          We’d Love Your Feedback
                        </h3>

                        <select
                          onChange={(e) => setRating(e.target.value)}
                          value={rating}
                          className="w-full rounded-lg border border-slate-300 bg-slate-100 p-3 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        >
                          {[...Array(5)].map((_, index) => (
                            <option key={index} value={index + 1}>
                              {index + 1} Star{index + 1 > 1 ? "s" : ""}
                            </option>
                          ))}
                        </select>

                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Write your feedback..."
                          rows="4"
                          className="mt-4 w-full rounded-lg border border-slate-300 bg-slate-100 p-3 font-medium text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />

                        <button
                          onClick={closeFeedbackModal}
                          className="mt-6 w-full rounded-full border border-slate-300 bg-slate-800 px-4 py-3 text-lg font-semibold text-white transition duration-300 hover:bg-teal-700 active:scale-[0.97]"
                        >
                          Submit Feedback
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule Modal */}
                {isScheduleModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FFFEFC]/70">
                    <div className="w-[90%] max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-2xl">
                      <h2 className="text-2xl font-bold mb-5 text-center">
                        Schedule Your Next Meeting
                      </h2>

                      <div className="flex flex-col gap-4">
                        <label className="flex flex-col font-medium">
                          <span className="mb-1">Select Date:</span>
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                          />
                        </label>

                        <label className="flex flex-col font-medium">
                          <span className="mb-1"> Select Time:</span>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                          />
                        </label>
                      </div>

                      <button
                        onClick={handleScheduleSession}
                        className="mt-6 w-full rounded-full border border-slate-300 bg-slate-800 px-4 py-3 text-lg font-semibold text-white transition duration-300 hover:bg-teal-700 active:scale-[0.97]"
                      >
                        Confirm Schedule
                      </button>

                      <button
                        onClick={closeScheduleModal}
                        className="absolute right-4 top-3 text-2xl text-slate-700 transition hover:text-slate-900"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                )}

                {/* Report Modal */}
                {isReportModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FFFEFC]/70">
                    <div className="w-[90%] max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-2xl">
                      <button
                        onClick={closeReportModal}
                        className="absolute right-4 top-3 text-2xl text-slate-700 transition hover:text-slate-900"
                      >
                        &times;
                      </button>
                      <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                        Report User
                      </h3>
                      <form onSubmit={handleReportSubmit}>
                        <div className="mb-4">
                          <label className="font-sm text-slate-900">Reason:</label>
                          <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900"
                          >
                            <option value="">Select Reason</option>
                            <option value="Spam">Spam</option>
                            <option value="Harassment">Harassment</option>
                            <option value="Inappropriate Behavior">
                              Inappropriate Behavior
                            </option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="mb-4">
                          <label className="font-sm text-slate-900">
                            Description:
                          </label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the issue"
                            required
                            className="mt-2 h-32 w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900 placeholder:text-slate-600"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="font-sm text-slate-900">
                            Attach Screenshot (Optional):
                          </label>
                          <input
                            type="file"
                            onChange={(e) => setScreenshot(e.target.files[0])}
                            accept="image/*"
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900"
                            placeholder="Upload Screenshot"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="mt-6 w-full rounded-full border border-slate-300 bg-slate-800 px-4 py-3 text-lg font-semibold text-white transition duration-300 hover:bg-teal-700 active:scale-[0.97]"
                          >
                            Submit Report
                          </button>
                        </div>
                      </form>
                      {reportSuccess && (
                        <div className="mt-4 text-green-600 text-center">
                          <p>Report submitted successfully!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <Footer />
      </div>

      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={closeVideoCall}
        session={selectedConnection}
        currentUserId={loggedInUser?._id}
      />
    </div>
  );
};

export default ChatPage;
