import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { io } from "socket.io-client";
import axios from "axios";
import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiMonitor,
  FiPhoneOff,
  FiX,
} from "react-icons/fi";
import MessageInput from "../chat/MessageInput";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const VideoCallModal = ({ isOpen, onClose, session, currentUserId }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const callIdRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const hasCreatedOfferRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const [callStatus, setCallStatus] = useState("Connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUserName, setRemoteUserName] = useState("Peer");
  const [messages, setMessages] = useState([]);

  const getPeerName = () => {
    if (!session) return "Peer";
    const user1Name = session.userId1?.name || "Peer";
    const user2Name = session.userId2?.name || "Peer";
    return session.userId1?._id === currentUserId ? user2Name : user1Name;
  };

  const getMessageSenderName = (message) =>
    message.sender?.name || message.senderId?.name || "User";

  const handleSendChatMessage = async (content, file) => {
    if (!session?._id || (!content.trim() && !file)) return;

    const formData = new FormData();
    formData.append("sessionId", session._id);
    formData.append("content", content);
    if (file) formData.append("file", file);

    try {
      const response = await axios.post(`${API_URL}/api/sessions/message`, formData, {
        headers: { "x-auth-token": localStorage.getItem("token") },
      });
      const sentMessage = response.data?.message;
      if (sentMessage) {
        const currentUser = [session.userId1, session.userId2].find(
          (user) => String(user?._id) === String(currentUserId),
        );
        setMessages((previousMessages) => {
          if (previousMessages.some((message) => String(message._id) === String(sentMessage._id))) {
            return previousMessages;
          }
          return [...previousMessages, {
            ...sentMessage,
            senderName: currentUser?.name || "You",
          }];
        });
      }
    } catch (error) {
      console.error("Error sending in-call message:", error);
    }
  };

  useEffect(() => {
    if (!session) return;
    setRemoteUserName(getPeerName());
  }, [session, currentUserId]);

  const stopLocalTrack = (kind) => {
    localStreamRef.current?.getTracks().forEach((track) => {
      if (track.kind === kind) track.stop();
    });
  };

  const cleanupCall = async () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.emit("leave-call", {
        sessionId: session?._id,
        userId: currentUserId,
      });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const callId = callIdRef.current || session?.callId;
    callIdRef.current = null;
    if (callId && currentUserId) {
      try {
        await axios.put(
          `${API_URL}/api/video-call/${callId}/end`,
          {
            endedAt: new Date().toISOString(),
          },
          {
            headers: { "x-auth-token": localStorage.getItem("token") },
          },
        );
      } catch (error) {
        console.error("Error ending call record:", error);
      }
    }
  };

  const createPeerConnection = () => {
    if (!session?._id) return null;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          sessionId: session._id,
          senderId: currentUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") setCallStatus("Connected");
      else if (state === "connecting") setCallStatus("Connecting");
      else if (state === "failed" || state === "disconnected")
        setCallStatus("Disconnected");
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  useEffect(() => {
    if (!isOpen || !session?._id || !currentUserId) return undefined;

    let isMounted = true;

    const initializeCall = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/sessions/message/${session._id}`,
          { headers: { "x-auth-token": localStorage.getItem("token") } },
        );
        if (isMounted) {
          setMessages((currentMessages) => {
            const merged = new Map();
            [...response.data, ...currentMessages].forEach((message, index) => {
              const key = message._id ? String(message._id) : `pending-${index}`;
              merged.set(key, {
                ...message,
                senderName: message.senderName || getMessageSenderName(message),
              });
            });
            return [...merged.values()].sort(
              (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
            );
          });
        }
      } catch (error) {
        console.error("Error loading in-call messages:", error);
      }

      try {
        const callResponse = await axios.post(
          `${API_URL}/api/video-call/initiate`,
          {
            sessionId: session._id,
            initiatedBy: currentUserId,
          },
          {
            headers: {
              "x-auth-token": localStorage.getItem("token"),
            },
          },
        );
        callIdRef.current = callResponse.data?.call?._id || null;
      } catch (error) {
        console.error("Error initializing call record:", error);
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const socket = io(`${API_URL}/sessions`, {
          transports: ["websocket"],
          query: { sessionId: session._id },
        });

        socketRef.current = socket;

        socket.on("receive_message", (message) => {
          setMessages((previousMessages) => {
            if (message._id && previousMessages.some((item) => String(item._id) === String(message._id))) {
              return previousMessages;
            }
            return [...previousMessages, {
              ...message,
              senderName: getMessageSenderName(message),
            }];
          });
        });

        socket.on("connect", () => {
          socket.emit("join-call", {
            sessionId: session._id,
            userId: currentUserId,
          });
        });

        socket.on("offer", async ({ offer, senderId }) => {
          if (senderId === currentUserId) return;
          const pc = createPeerConnection();
          if (!pc) return;

          localStreamRef.current
            ?.getTracks()
            .forEach((track) => pc.addTrack(track, localStreamRef.current));
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", {
            sessionId: session._id,
            senderId: currentUserId,
            receiverId: senderId,
            answer,
          });
        });

        socket.on("answer", async ({ answer, senderId }) => {
          if (senderId === currentUserId) return;
          const pc = peerConnectionRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          setCallStatus("Connected");
        });

        socket.on("ice-candidate", async ({ candidate, senderId }) => {
          if (senderId === currentUserId || !candidate) return;
          const pc = peerConnectionRef.current;
          if (!pc) return;
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on("peer-joined", async ({ userId, peerSocketId }) => {
          if (!userId || userId === currentUserId) return;
          if (hasCreatedOfferRef.current) return;

          const pc = createPeerConnection();
          if (!pc) return;

          localStreamRef.current
            ?.getTracks()
            .forEach((track) => pc.addTrack(track, localStreamRef.current));

          hasCreatedOfferRef.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", {
            sessionId: session._id,
            senderId: currentUserId,
            receiverId: userId,
            offer,
          });
          setCallStatus("Connecting");
        });

        socket.on("leave-call", () => {
          setCallStatus("Disconnected");
          onClose();
        });
      } catch (error) {
        console.error("Unable to access camera or microphone:", error);
        setCallStatus("Permission denied");
      }
    };

    initializeCall();

    return () => {
      isMounted = false;
      cleanupCall();
    };
  }, [isOpen, session?._id, currentUserId]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const formatDuration = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;

    const nextMuteState = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuteState;
    });
    setIsMuted(nextMuteState);
    socketRef.current?.emit("toggle-mute", {
      sessionId: session?._id,
      userId: currentUserId,
      isMuted: nextMuteState,
    });
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;

    const nextVideoOffState = !isVideoOff;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !nextVideoOffState;
    });
    setIsVideoOff(nextVideoOffState);
    socketRef.current?.emit("toggle-video", {
      sessionId: session?._id,
      userId: currentUserId,
      isVideoOff: nextVideoOffState,
    });
  };

  const restoreCameraVideoTrack = () => {
    if (!peerConnectionRef.current || !localStreamRef.current) return;

    const localCameraTrack = localStreamRef.current.getVideoTracks()[0];
    if (!localCameraTrack) return;

    const sender = peerConnectionRef.current
      ?.getSenders()
      .find((s) => s.track?.kind === "video");

    if (sender) {
      sender.replaceTrack(localCameraTrack);
    }
  };

  const handleScreenShare = async () => {
    if (!peerConnectionRef.current) return;

    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      restoreCameraVideoTrack();
      setIsScreenSharing(false);
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      screenStreamRef.current = screenStream;
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current
        ?.getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender) sender.replaceTrack(videoTrack);

      videoTrack.onended = () => {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop());
          screenStreamRef.current = null;
        }
        restoreCameraVideoTrack();
        setIsScreenSharing(false);
      };

      setIsScreenSharing(true);
    } catch (error) {
      console.error("Unable to share screen:", error);
    }
  };

  const endCall = async () => {
    await cleanupCall();
    onCloseRef.current?.();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          className="relative h-[92dvh] w-[96vw] overflow-hidden rounded-[28px] border border-white/20 bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 shadow-2xl"
        >
          <button
            onClick={endCall}
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white shadow-lg transition hover:bg-white/20"
            aria-label="Close video call"
          >
            <FiX className="text-xl" />
          </button>

          <div className="absolute left-6 top-6 z-20 flex items-center gap-3 rounded-full bg-slate-950/40 px-4 py-2 text-sm text-white backdrop-blur-md">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            {callStatus}
          </div>

          <div className="absolute right-6 top-6 z-20 rounded-full bg-slate-950/40 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
            {formatDuration(callDuration)}
          </div>

          <div className="grid h-full w-full grid-cols-1 gap-4 p-4 pb-24 md:p-6 md:pb-28 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-2">
              <div className="relative min-h-[14rem] overflow-hidden rounded-3xl border border-white/20 bg-slate-950/20 shadow-xl">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent p-4 text-left text-white">
                  <div className="text-xl font-semibold">{remoteUserName}</div>
                  <div className="text-sm text-slate-100">
                    Skill session live
                  </div>
                </div>
              </div>

              <div className="relative min-h-[14rem] overflow-hidden rounded-3xl border border-white/20 bg-slate-950/20 shadow-xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`h-full w-full object-cover ${isVideoOff ? "scale-90 opacity-50" : ""}`}
                />
                <div className="absolute bottom-4 left-4 rounded-full bg-slate-950/60 px-3 py-1 text-sm text-white backdrop-blur-md">
                  You
                </div>
              </div>
            </div>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-950/75 shadow-xl backdrop-blur-md">
              <div className="border-b border-white/10 px-4 py-3">
                <h3 className="font-semibold text-white">Session chat</h3>
                <p className="text-xs text-slate-200">
                  Resolve doubts while you learn
                </p>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {messages.length > 0 ? (
                  messages.map((message, index) => {
                    const senderId = message.senderId?._id || message.senderId || message.sender?.id;
                    const isOwnMessage = String(senderId) === String(currentUserId);

                    return (
                      <div
                        key={message._id || `${message.createdAt}-${index}`}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl border p-3 text-sm text-slate-900 shadow-md backdrop-blur-sm ${
                            isOwnMessage
                              ? "border-sky-300/80 bg-sky-200/75"
                              : "border-slate-300 bg-white/90"
                          }`}
                        >
                          <p className={`mb-1 text-xs font-semibold text-slate-700 ${isOwnMessage ? "text-right" : "text-left"}`}>
                            {message.senderName || getMessageSenderName(message)}
                          </p>
                          <span dangerouslySetInnerHTML={{ __html: message.content }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No messages yet
                  </p>
                )}
              </div>
              <div className="border-t border-white/10 p-2">
                <MessageInput sendMessage={handleSendChatMessage} />
              </div>
            </aside>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-3 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent p-5 pb-7">
            <button
              onClick={toggleMute}
              className={`flex h-14 w-14 items-center justify-center rounded-full ${isMuted ? "bg-red-500" : "bg-white/10"} text-xl text-white shadow-md transition hover:scale-105`}
            >
              {isMuted ? <FiMicOff /> : <FiMic />}
            </button>

            <button
              onClick={toggleVideo}
              className={`flex h-14 w-14 items-center justify-center rounded-full ${isVideoOff ? "bg-red-500" : "bg-white/10"} text-xl text-white shadow-md transition hover:scale-105`}
            >
              {isVideoOff ? <FiVideoOff /> : <FiVideo />}
            </button>

            <button
              onClick={handleScreenShare}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-xl text-white shadow-md transition hover:scale-105"
            >
              <FiMonitor />
            </button>

            <button
              onClick={endCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-xl text-white shadow-md transition hover:scale-105"
            >
              <FiPhoneOff />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoCallModal;
