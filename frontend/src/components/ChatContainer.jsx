import { useChatStore } from "../store/useChatStore";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { analyzeChat } from "../lib/geminiAnalyzer";

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

    console.log("[Analyzer] Sending chat to Gemini for analysis...");

    try {
      const data = await analyzeChat(conversationText);
      console.log("[Analyzer] Gemini response:", data);

      setAnalysisResult({
        ...data,
        analyzedAt: new Date().toISOString(),
      });
      setLastAnalyzedCount(messages.length);

      if (data.isScam) {
        toast.error("⚠️ Scam alert: this conversation looks like social engineering.");
      } else {
        toast.success("✅ Conversation appears legitimate.");
      }
    } catch (error) {
      toast.error(error.message || "Failed to analyze chat.");
      console.error("[Analyzer] Error:", error);
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
            <span className="font-semibold text-lg">
              {analysisResult.isScam ? "⚠️ Scam Warning" : "✅ Analysis Result"}
            </span>
            <p className="mt-1">
              {analysisResult.summary}
            </p>
            <p className="text-sm opacity-70 mt-2">
              Confidence: {Math.round(analysisResult.confidence * 100)}% • Severity: {analysisResult.severity?.toUpperCase()}
            </p>
            {analysisResult.isScam && analysisResult.indicators?.length > 0 && (
              <p className="text-sm opacity-70 mt-1">
                🚩 Indicators: {analysisResult.indicators.join(", ")}
              </p>
            )}
            {analysisResult.isScam && analysisResult.manipulation_techniques?.length > 0 && (
              <p className="text-sm opacity-70 mt-1">
                🎯 Techniques: {analysisResult.manipulation_techniques.join(", ")}
              </p>
            )}
            {analysisResult.explanation && (
              <details className="mt-2">
                <summary className="text-sm cursor-pointer opacity-70 hover:opacity-100">View detailed explanation</summary>
                <p className="text-sm mt-1 opacity-80">{analysisResult.explanation}</p>
              </details>
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
