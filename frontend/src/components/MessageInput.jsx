import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image as ImageIcon, Send, X } from "lucide-react"; // Renamed Image to ImageIcon
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [compressedImage, setCompressedImage] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  // Handle image selection & preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      toast.error("No file selected");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    // Show preview first
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      compressImage(reader.result); // Compress image after preview
    };
    reader.readAsDataURL(file);
  };

  // Compress image before sending
  const compressImage = (dataUrl) => {
    const img = new window.Image(); // Use window.Image() to avoid conflict
    img.src = dataUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set max width & height
      const MAX_WIDTH = 300;
      const MAX_HEIGHT = 300;

      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        if (width > height) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        } else {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG (0.7 quality)
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);

      // Check size & warn if still too big
      if (compressedDataUrl.length > 100 * 1024) {
        toast.error("Image is still too large after compression!");
        setCompressedImage(null);
      } else {
        setCompressedImage(compressedDataUrl);
      }
    };
  };

  // Remove image
  const removeImage = () => {
    setImagePreview(null);
    setCompressedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle message send
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !compressedImage) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: compressedImage, // Sends compressed image
      });

      // Clear form
      setText("");
      setImagePreview(null);
      setCompressedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !compressedImage}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
