import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers, authUser: loggedInUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [debugMode, setDebugMode] = useState(false); // Debug info off by default

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Detailed debugging section
  useEffect(() => {
    if (debugMode) {
      console.log("========== DETAILED DEBUG INFO ==========");
      console.log("Current user:", loggedInUser);
      console.log("Current user interests:", loggedInUser?.interests);
      console.log("Current user interests type:", loggedInUser?.interests ? typeof loggedInUser.interests : "undefined");
      console.log("Is interests an array?", Array.isArray(loggedInUser?.interests));
      
      console.log("\nAll users:");
      users.forEach((user, index) => {
        console.log(`User ${index}: ${user.fullName}`);
        console.log(`- ID: ${user._id}`);
        console.log(`- Interests: ${JSON.stringify(user.interests)}`);
        console.log(`- Interests type: ${typeof user.interests}`);
        console.log(`- Is interests an array? ${Array.isArray(user.interests)}`);
        
        // Check matching
        if (loggedInUser?.interests && Array.isArray(loggedInUser.interests) && 
            user.interests && Array.isArray(user.interests)) {
          
          const matches = user.interests.filter(interest => 
            loggedInUser.interests.includes(interest)
          );
          
          console.log(`- Matching interests: ${matches.length > 0 ? matches.join(", ") : "None"}`);
          console.log(`- Should be displayed: ${matches.length > 0 && user._id !== loggedInUser?._id}`);
        } else {
          console.log("- Cannot check matches - invalid interest data");
        }
        console.log("---");
      });
      console.log("=========================================");
    }
  }, [users, loggedInUser, debugMode]);

  // Show all users with minimal filtering for debugging
  const allOtherUsers = users.filter(user => user._id !== loggedInUser?._id);
  
  // Normal filtering based on interest matching (but with extra logging)
  const filteredUsers = users.filter((user) => {
    // Skip current logged-in user
    if (user._id === loggedInUser?._id) {
      if (debugMode) console.log(`Skipping ${user.fullName} (current user)`);
      return false;
    }
    
    // Check if user has interests array
    if (!user.interests || !Array.isArray(user.interests)) {
      if (debugMode) console.log(`${user.fullName} has no interests array`);
      return false;
    }
    
    // Check if logged in user has interests array
    if (!loggedInUser?.interests || !Array.isArray(loggedInUser.interests)) {
      if (debugMode) console.log(`Logged in user has no interests array`);
      return false;
    }
    
    // Check if any interests match
    const hasMatch = user.interests.some(interest => 
      loggedInUser.interests.includes(interest)
    );
    
    if (debugMode) {
      console.log(`${user.fullName} interests: ${user.interests.join(", ")}`);
      console.log(`Logged in user interests: ${loggedInUser.interests.join(", ")}`);
      console.log(`Match found: ${hasMatch}`);
    }
    
    return hasMatch;
  });

  // Apply online filter
  const displayedUsers = showOnlineOnly
    ? filteredUsers.filter((user) => onlineUsers.includes(user._id))
    : filteredUsers;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>
        
        {/* Online filter toggle */}
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>
        
        {/* Debug info */}
        {debugMode && (
          <div className="mt-2 p-2 bg-yellow-100 text-xs rounded">
            <div>Debug Mode: ON</div>
            <div>Your ID: {loggedInUser?._id}</div>
            <div>Your interests: {loggedInUser?.interests ? JSON.stringify(loggedInUser.interests) : "None"}</div>
            <div>Total users: {users.length}</div>
            <div>Matching users: {filteredUsers.length}</div>
            <button 
              className="mt-1 px-2 py-1 bg-base-300 rounded text-xs"
              onClick={() => setDebugMode(false)}
            >
              Hide Debug
            </button>
          </div>
        )}
        
        {/* Display current user's interests */}
        {!debugMode && loggedInUser?.interests && Array.isArray(loggedInUser.interests) && (
          <div className="mt-2 text-xs text-zinc-500">
            <span>Your interests: </span>
            <span className="font-medium">{loggedInUser.interests.join(", ")}</span>
          </div>
        )}
        
        {/* Display match count */}
        {!debugMode && (
          <div className="mt-1 text-xs text-zinc-500">
            <span>Matching users: </span>
            <span className="font-medium">{filteredUsers.length}</span>
          </div>
        )}
        
        {!debugMode && (
          <button 
            className="mt-1 text-xs text-blue-500 underline"
            onClick={() => setDebugMode(true)}
          >
            Show Debug Info
          </button>
        )}
      </div>

      <div className="overflow-y-auto w-full py-3">
        {/* Show debug view with all other users when in debug mode */}
        {debugMode ? (
          <>
            <div className="p-2 text-center bg-red-100 text-xs font-bold">
              DEBUG VIEW - SHOWING ALL USERS
            </div>
            {allOtherUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className="w-full p-3 flex items-center gap-3 border-b hover:bg-red-50"
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="size-12 object-cover rounded-full"
                  />
                </div>
                <div className="hidden lg:block text-left min-w-0 text-xs">
                  <div className="font-medium">{user.fullName || user.name || user.username || "Unknown"}</div>
                  <div>ID: {user._id}</div>
                  <div>Interests: {user.interests ? JSON.stringify(user.interests) : "None"}</div>
                  <div>
                    Match: {
                      loggedInUser?.interests && Array.isArray(loggedInUser.interests) && 
                      user.interests && Array.isArray(user.interests) &&
                      user.interests.some(i => loggedInUser.interests.includes(i)) ? 
                      "YES" : "NO"
                    }
                  </div>
                </div>
              </button>
            ))}
          </>
        ) : (
          // Normal view with filtered users
          displayedUsers.length > 0 ? (
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
              {filteredUsers.length === 0 ? "No users with matching interests" : "No online users with matching interests"}
            </div>
          )
        )}
      </div>
    </aside>
  );
};
export default Sidebar;