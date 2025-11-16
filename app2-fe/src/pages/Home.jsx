import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner'; 
import { useAuthLogout } from '../App'; 
import MainLayout from '../layouts/MainLayout';
import ThreadItem from '../components/ThreadItem';

// --- Utility Functions ---
const apiUrl = import.meta.env.VITE_API_URL;

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

function resolveImageUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${apiUrl}/${path}`; 
}

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}


export default function Home() {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const { forceLogout } = useAuthLogout(); 
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    
    const [profilePictureUrl, setProfilePictureUrl] = useState("");

    const fetchUserProfile = useCallback(async () => {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        try {
            const res = await fetch(`${apiUrl}/users/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const path = data.data.profile_picture_path;
                setProfilePictureUrl(path ? resolveImageUrl(path) : "");
            }
        } catch (error) {
            console.error("Failed to fetch profile picture path:", error);
        }
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchUserProfile();
        }
    }, [currentUser, fetchUserProfile]);


    const fetchThreads = useCallback(async (query) => {
        setLoading(true);
        try {
            // Encode query untuk keamanan, meskipun backend rentan SQLi
            const encodedQuery = encodeURIComponent(query);
            const endpoint = query 
                ? `${apiUrl}/threads/search?q=${encodedQuery}` 
                : `${apiUrl}/threads`;
            
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    forceLogout("Sesi Anda mungkin telah berakhir saat memuat data.");
                    return;
                }
                if (query) {
                    throw new Error(`Search failed. Response status: ${response.status}. (Check A03: SQLi)`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            const rawThreads = Array.isArray(data.data) ? data.data : [data.data].filter(Boolean);

            const mappedThreads = rawThreads.map(thread => ({
                id: thread.thread_id || thread.id, 
                title: thread.title,
                content: thread.content,
                username: thread.author?.username || thread.author_username || 'Unknown', 
                authorProfilePicturePath: thread.author?.profile_picture_path || thread.author_profile_picture_path || '', 
                createdAt: thread.created_at,
                likes: thread._count?.threadLikes || 0,
                postsCount: thread._count?.posts || 0,
                images: thread.attachments?.map(att => att.file_path) || [],
                isLiked: false 
            }));

            setThreads(mappedThreads);

        } catch (error) {
            console.error("Gagal mengambil data threads:", error);
            if (error.message.includes('SQLi')) {
                toast.error("SQL Injection Detected (A03)", { description: error.message });
            } else {
                toast.error("Failed to load threads.", { description: error.message });
            }
            setThreads([]);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchQuery, forceLogout]); 

    useEffect(() => {
        fetchThreads(debouncedSearchQuery);
    }, [fetchThreads, debouncedSearchQuery]); 

    const handleLikeClick = (threadId, isLiked) => {
        if (!isLoggedIn()) {
            return toast.warning("Login required to like posts.");
        }
        
        // Optimistic UI update
        setThreads(currentThread => 
            currentThread.map(thread => {
                if (thread.id === threadId) {
                    const newLikesCount = isLiked ? thread.likes - 1 : thread.likes + 1;
                    return { ...thread, likes: newLikesCount, isLiked: !isLiked }; 
                }
                return thread;
            })
        );
        
        console.log(`Toggling like API call for thread ID: ${threadId}`);
    };

    return (
        <MainLayout 
            currentUser={currentUser}
            profilePictureUrl={profilePictureUrl}
            forceLogout={forceLogout}
            onSearchChange={setSearchQuery}
            searchValue={searchQuery}
            title="Homepage"
        >
            <div className="bg-white">
                {loading ? (
                    <Card className="p-6 text-center rounded-none shadow-none">Loading threads...</Card>
                ) : threads.length === 0 ? (
                    <Card className="p-6 text-center text-gray-500 rounded-none shadow-none">
                        {searchQuery ? `No threads found for "${searchQuery}".` : "No threads found."}
                    </Card>
                ) : (
                    threads.map(thread => (
                        <ThreadItem 
                            key={thread.id} 
                            thread={thread} 
                            onLikeClick={handleLikeClick}
                        />
                    ))
                )}
                {/* Menghapus gap-4 dan mengganti dengan border-t di ThreadItem (Permintaan #1) */}
            </div>
        </MainLayout>
    );
}