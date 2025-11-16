import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageSquare } from 'lucide-react'; 

import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const apiUrl = import.meta.env.VITE_API_URL;

// Helper function to resolve image URL
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


export default function ThreadItem({ thread, onLikeClick }) {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    // PERHATIAN: Ini adalah implementasi SANGAT TIDAK AMAN yang sengaja 
    // digunakan untuk mensimulasikan dan menguji kerentanan XSS (A03)
    const renderContent = (content) => {
        return <div dangerouslySetInnerHTML={{ __html: content }} />;
    };

    const threadUrl = `/thread/${thread.id}`;
    const handleCardClick = () => navigate(threadUrl);

    const initials = thread.username ? thread.username[0].toUpperCase() : 'U';
    const authorAvatarUrl = thread.authorProfilePicturePath ? resolveImageUrl(thread.authorProfilePicturePath) : ''; 
    const username = thread.username;
    
    const handleProfileClick = (e) => {
        e.stopPropagation();
        if (currentUser && currentUser.username === username) {
            navigate(`/profile`);
        } else {
            navigate(`/users/${username}`);
        }
    }

    return (
        <Card 
            className="p-4 cursor-pointer hover:bg-gray-50 transition border-t border-b-0 border-x-0 rounded-none shadow-none" 
            onClick={handleCardClick}
        >
            <div className="flex gap-3 items-center mb-3">
                {/* Bagian yang Dapat Diklik */}
                <div className="flex gap-3 items-center cursor-pointer" onClick={handleProfileClick}>
                    <Avatar className="size-10 shrink-0">
                        <AvatarImage src={authorAvatarUrl} alt={username} /> 
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-bold text-gray-800 hover:underline">@{username}</div>
                        <div className="text-xs text-gray-500">
                            {new Date(thread.createdAt).toLocaleTimeString()} • {new Date(thread.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <h2 className="font-semibold text-lg">{thread.title}</h2>
                
                <div className="text-gray-700 mb-2">
                    {renderContent(thread.content)}
                </div>
            </div>

            {/* Displaying first image attachment */}
            {thread.images && thread.images.length > 0 && (
                <div className="w-full h-auto max-h-80 bg-gray-200 rounded-md overflow-hidden my-3">
                    <img 
                        src={resolveImageUrl(thread.images[0])} 
                        alt="Thread attachment" 
                        className="object-cover w-full h-full" 
                        onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = "https://via.placeholder.com/150?text=Image+Error";
                        }}
                    />
                </div>
            )}
            
            <hr className="my-3"/>
            
            <div className="flex justify-end gap-6 text-sm text-gray-600">
                <button
                    onClick={(e) => {
                        e.stopPropagation(); 
                        onLikeClick(thread.id, thread.isLiked);
                    }}
                    className={`flex items-center gap-1 transition-colors ${
                        thread.isLiked ? 'text-red-500' : 'hover:text-red-500'
                    }`}
                >
                    <Heart className="w-4 h-4" fill={thread.isLiked ? 'red' : 'none'} /> 
                    {thread.likes || 0}
                </button>
                <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" /> {thread.postsCount || 0}
                </span>
            </div>
        </Card>
    );
}