import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers, authUser: loggedInUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showMatchingOnly, setShowMatchingOnly] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Base list of users (excluding current user)
  let displayedUsers = users.filter((user) => user._id !== loggedInUser?._id);

  // Apply online filter
  if (showOnlineOnly) {
    displayedUsers = displayedUsers.filter((user) => onlineUsers.includes(user._id));
  }

  // Apply matching interests filter
  if (showMatchingOnly) {
    displayedUsers = displayedUsers.filter((user) => {
      if (!user.interests || !Array.isArray(user.interests)) return false;
      if (!loggedInUser?.interests || !Array.isArray(loggedInUser.interests)) return false;
      return user.interests.some(interest => loggedInUser.interests.includes(interest));
    });
  }

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>
        
        <div className="mt-3 hidden lg:flex flex-col gap-2">
          {/* Online filter toggle */}
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
            <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
          </label>

          {/* Matching filter toggle */}
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showMatchingOnly}
              onChange={(e) => setShowMatchingOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show matching only</span>
          </label>
        </div>
        
      </div>

      <div className="overflow-y-auto w-full py-3">
        {displayedUsers.length > 0 ? (
          displayedUsers.map((user) => (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName || user.name || user.username || "Contact"}
                  className="size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                    rounded-full ring-2 ring-zinc-900"
                  />
                )}
              </div>

              <div className="hidden lg:block text-left min-w-0">
                <div className="font-medium truncate">{user.fullName || user.name || user.username || "Unknown"}</div>
                <div className="text-sm text-zinc-400">
                  {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                </div>
                {user.interests && loggedInUser?.interests && (
                  <div className="text-xs text-zinc-500 mt-1">
                    {user.interests
                      .filter(interest => loggedInUser.interests.includes(interest))
                      .join(", ")}
                  </div>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="text-center text-zinc-500 py-4">
            No users found
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;