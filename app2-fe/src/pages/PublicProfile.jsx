import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import MainLayout from '../layouts/MainLayout';
import { useAuthLogout } from "../App";

// --- Utility Functions ---
const apiUrl = import.meta.env.VITE_API_URL;

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase());
}

function resolveImageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiUrl}/${path}`; 
}

function getCurrentUser() {
    const userProfileString = localStorage.getItem("userProfile");
    if (userProfileString) {
        try {
            return JSON.parse(userProfileString);
        } catch (e) {
            return null;
        }
    }
    return null;
}

// --- Komponen Utama PublicProfile ---
export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { forceLogout } = useAuthLogout(); 
  const [userProfile, setUserProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [threads, setThreads] = React.useState([]);
  const currentUser = getCurrentUser();
  
  // State untuk avatar di header (walaupun ini profil orang lain)
  const [currentUserProfilePicture, setCurrentUserProfilePicture] = React.useState("");
  
  // Fetch current user's profile picture for the header
  React.useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    async function fetchCurrentUserProfile() {
        try {
            const res = await fetch(`${apiUrl}/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setCurrentUserProfilePicture(data.data.profile_picture_path ? resolveImageUrl(data.data.profile_picture_path) : "");
            }
        } catch (error) {
            console.error("Failed to fetch current user profile picture:", error);
        }
    }
    fetchCurrentUserProfile();
  }, []);

  // Fetch Public Profile and Threads
  React.useEffect(() => {
    if (!username) return;

    async function fetchData() {
      setLoading(true);
      try {
        // 1. Fetch Profile Data
        const profileRes = await fetch(`${apiUrl}/users/${username}`);
        if (!profileRes.ok) {
          throw new Error("User not found.");
        }
        const profileData = await profileRes.json();
        setUserProfile(profileData.data);

        // 2. Fetch User Threads
        const threadsRes = await fetch(`${apiUrl}/users/${username}/threads`);
        if (!threadsRes.ok) {
          throw new Error("Failed to fetch user threads.");
        }
        const threadsData = await threadsRes.json();
        setThreads(threadsData.data);

      } catch (err) {
        console.error(err);
        toast.error("Failed to load profile.", { description: err.message || "Unknown error" });
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [username]);

  if (loading) {
    return (
      <MainLayout 
        currentUser={currentUser}
        profilePictureUrl={currentUserProfilePicture}
        forceLogout={forceLogout}
        allowSearch={false}
      >
        <p className="text-center text-gray-500 py-6">Loading profile data...</p>
      </MainLayout>
    );
  }

  if (!userProfile) {
    return (
      <MainLayout 
        currentUser={currentUser}
        profilePictureUrl={currentUserProfilePicture}
        forceLogout={forceLogout}
        allowSearch={false}
      >
        <p className="text-center text-gray-500 py-6">User @{username} not found.</p>
      </MainLayout>
    );
  }

  const profileAvatarUrl = userProfile.profile_picture_path ? resolveImageUrl(userProfile.profile_picture_path) : '';
  const initials = getInitials(userProfile.username);

  return (
    <MainLayout 
        currentUser={currentUser}
        profilePictureUrl={currentUserProfilePicture}
        forceLogout={forceLogout}
        allowSearch={false}
    >
      <div className="py-6"> 
        <div className="max-w-2xl mx-auto"> 
          <Card className="p-6">
            <h1 className="text-xl font-bold border-b pb-4 mb-4">Profile</h1>
            
            <div className="flex items-start gap-6">
                <Avatar className="size-28 border-2 border-primary shrink-0">
                    <AvatarImage src={profileAvatarUrl} alt={userProfile.username} />
                    <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold">@{userProfile.username}</h2>
                    <p className="text-sm text-muted-foreground">Joined: {new Date(userProfile.created_at).toLocaleDateString()}</p>
                    <p className="text-base mt-2 whitespace-pre-line">
                        {userProfile.bio || "No bio available."}
                    </p>
                </div>
            </div>
          </Card>

          <h2 className="text-xl font-bold mt-8 mb-4">Threads ({threads.length})</h2>
          <div className="bg-white border rounded-lg overflow-hidden">
            {threads.length > 0 ? (
                threads.map((thread, index) => (
                    <div 
                        key={thread.thread_id} 
                        className={`p-4 hover:bg-gray-50 cursor-pointer ${index < threads.length - 1 ? 'border-b' : ''}`}
                        onClick={() => navigate(`/thread/${thread.thread_id}`)}
                    >
                        <h3 className="font-semibold text-lg">{thread.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {new Date(thread.created_at).toLocaleDateString()} • {thread._count.posts || 0} replies
                        </p>
                    </div>
                ))
            ) : (
                <p className="p-4 text-gray-500">This user hasn't created any threads yet.</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}