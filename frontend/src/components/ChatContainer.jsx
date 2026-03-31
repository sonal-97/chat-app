import { useChatStore } from "../store/useChatStore";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [lastAnalyzedCount, setLastAnalyzedCount] = useState(0);

  const buildConversationText = useCallback(() => {
    return messages
      .map((message) => {
        const sender =
          message.senderId === authUser._id
            ? authUser.username || "You"
            : selectedUser.username || selectedUser.name || "Contact";
        const text = message.text?.trim();
        return text ? `${sender}: ${text}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }, [messages, authUser, selectedUser]);

  const analyzeConversation = useCallback(async () => {
    if (!messages?.length || !selectedUser) return;

    const conversationText = buildConversationText();
    if (!conversationText.trim()) return;

    const requestBody = { message: conversationText };
    console.log("[Analyzer] Sending chat analysis request:", requestBody);

    try {
      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("[Analyzer] Received response:", response.status, data);
      if (!response.ok) {
        throw new Error(data.error || "Analysis request failed.");
      }

      const isScam =
        data.classification === "Social Engineering" || data.gemini_is_scam;

      setAnalysisResult({
        ...data,
        isScam,
        analyzedAt: new Date().toISOString(),
      });
      setLastAnalyzedCount(messages.length);

      if (isScam) {
        toast.error("Scam alert: this conversation looks like social engineering.");
      } else {
        toast.success("Conversation appears legitimate.");
      }
    } catch (error) {
      toast.error(error.message || "Failed to analyze chat.");
      console.error(error);
    }
  }, [buildConversationText, messages, selectedUser]);

  useEffect(() => {
    getMessages(selectedUser._id);
    setLastAnalyzedCount(0);
    setAnalysisResult(null);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (
      messages.length >= 5 &&
      messages.length % 5 === 0 &&
      messages.length !== lastAnalyzedCount
    ) {
      analyzeConversation();
    }
  }, [messages.length, lastAnalyzedCount, analyzeConversation]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        analyzeConversation();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [analyzeConversation]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      {analysisResult && (
        <div
          className={`alert shadow-lg mx-4 mt-4 ${
            analysisResult.isScam ? "alert-error" : "alert-success"
          }`}
        >
          <div>
            <span className="font-semibold">
              {analysisResult.isScam ? "Scam warning:" : "Analysis result:"}
            </span>
            <p className="mt-1">
              {analysisResult.isScam
                ? "This conversation appears to contain social engineering content."
                : "This conversation appears legitimate."}
            </p>
            <p className="text-sm opacity-70 mt-2">
              Verdict: {analysisResult.classification} • Probability: {analysisResult.probability}
            </p>
            {analysisResult.isScam && (
              <p className="text-sm opacity-70 mt-1">
                Indicators: {analysisResult.gemini_indicators?.join(", ") || "None"}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
