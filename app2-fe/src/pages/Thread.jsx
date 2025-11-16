import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, MoreHorizontal, Trash2, Pencil, Upload, XCircle, Heart, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from "sonner"; 
import GlobalHeader from '../components/GlobalHeader';
import { useAuthLogout } from '../App';

const apiUrl = import.meta.env.VITE_API_URL;

// Helper untuk memeriksa status login
function isLoggedIn() {
    return !!localStorage.getItem("authToken");
}

const getInitials = (username) => {
    return username ? username[0].toUpperCase() : 'U';
};

// Helper function to get current user details
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

// Helper untuk mendapatkan user ID dari token
function getCurrentUserId() {
    const userProfileString = localStorage.getItem("userProfile");
    if (userProfileString) {
        try {
            const user = JSON.parse(userProfileString);
            return user.user_id; 
        } catch (e) {
            console.error("Error parsing user profile:", e);
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


// Komponen untuk menampilkan sebuah Post
const PostItem = ({ post, isMainThread = false, currentUserId, onPostDeleted, onPostEdited, currentUser }) => {
    if (!post || !post.author) return null; 
    const navigate = useNavigate(); 
    const isReply = !isMainThread;
    
    const isOwner = post.author.user_id === currentUserId; 
    const authorInitials = getInitials(post.author.username); 
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editContent, setEditContent] = useState(post.content || '');
    const authorAvatarUrl = post.author.profile_picture_path ? resolveImageUrl(post.author.profile_picture_path) : '';

    // [PERBAIKAN XSS FRONTEND] Fungsi renderContent dihilangkan dan konten dirender sebagai teks biasa

    // --- Handler Edit ---
    const handleEditPost = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) return toast.error("Autentikasi diperlukan.");

        if (isMainThread) {
            // Edit Thread
            try {
                const response = await fetch(`${apiUrl}/threads/${post.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        title: post.title, 
                        content: editContent, 
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Gagal mengedit thread.");
                }

                toast.success("Thread berhasil diperbarui.");
                setIsEditDialogOpen(false);
                onPostEdited();
            } catch (error) {
                toast.error("Gagal mengedit thread.", { description: error.message });
            }
        } else {
            // Edit Post (Reply)
            try {
                const response = await fetch(`${apiUrl}/posts/${post.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        content: editContent,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Gagal mengedit post.");
                }

                toast.success("Post berhasil diperbarui.");
                setIsEditDialogOpen(false);
                onPostEdited();
            } catch (error) {
                toast.error("Gagal mengedit post.");
            }
        }
    };

    const handleProfileClick = (e) => {
        e.stopPropagation();
        const postAuthorUsername = post.author.username;
        if (currentUser && currentUser.username === postAuthorUsername) {
            navigate(`/profile`);
        } else {
            navigate(`/users/${postAuthorUsername}`);
        }
    }

    // --- Handler Delete ---
    const handleDeletePost = async () => {
        if (!window.confirm(`Yakin ingin menghapus ${isMainThread ? 'thread utama' : 'post ini'}?`)) return;

        const token = localStorage.getItem("authToken");
        if (!token) return toast.error("Autentikasi diperlukan.");

        const endpoint = isMainThread ? `${apiUrl}/threads/${post.id}` : `${apiUrl}/posts/${post.id}`;
        
        try {
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Gagal menghapus ${isMainThread ? 'thread' : 'post'}.`);
            }

            toast.success(`${isMainThread ? 'Thread' : 'Post'} berhasil dihapus.`);
            onPostDeleted(isMainThread); 
        } catch (error) {
            toast.error(`Gagal menghapus ${isMainThread ? 'thread' : 'post'}.`);
        }
    };

    const threadTitle = post.title;

    return (
        <>
            <Card className={`p-4 border-none shadow-none`}>
                <div className="flex justify-between items-start mb-2">
                    {/* Header Post */}
                    <div className="flex gap-3 items-center cursor-pointer" onClick={handleProfileClick}>
                        <Avatar>
                            <AvatarImage src={authorAvatarUrl} alt={post.author.username} />
                            <AvatarFallback>{authorInitials}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-bold hover:underline">@{post.author.username || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{post.createdAt || "Date not available"}</div>
                        </div>
                    </div>
                    
                    {/* Menu Aksi (Edit/Delete) - Hanya untuk pemilik */}
                    {isLoggedIn() && isOwner && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDeletePost} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Judul Thread Utama */}
                {isMainThread && <div className="text-xl font-bold mb-3">{threadTitle}</div>}

                {/* Reply To */}
                {isReply && post.replyingTo && (
                    <div className="text-sm text-blue-600 mb-2 ml-14">
                        Replying to <span className="font-semibold">@{post.replyingTo}</span>
                    </div>
                )}

                {/* Konten Post */}
                <div className={`text-gray-700 mb-4 whitespace-pre-line ${isReply ? 'ml-14' : ''}`}>
                    {post.content} {/* <-- PERBAIKAN AKHIR: Merender sebagai teks biasa */}
                </div>

                {/* Media/Attachments */}
                {post.images && post.images.length > 0 && (
                    <div className={`flex flex-wrap gap-2 mb-4 ${isReply ? 'ml-14' : ''}`}>
                        {post.images.map((img, index) => (
                            <div key={index} className="w-full sm:w-1/2 md:w-1/3 max-h-64 overflow-hidden rounded-lg border">
                                <img 
                                    src={resolveImageUrl(img)} 
                                    alt={`Attachment ${index}`} 
                                    className="object-cover w-full h-full" 
                                    onError={(e) => {
                                        e.target.onerror = null; 
                                        e.target.src = "https://via.placeholder.com/150?text=Error+Loading+Image"; // Fallback image
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer Interaksi */}
                <hr className="my-3"/>
                <div className="flex justify-end gap-6 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                        <button className="hover:text-red-500 transition-colors flex items-center gap-1">
                            <Heart className="w-4 h-4" fill={post.isLiked ? 'red' : 'none'} />
                        </button>
                        {post.likes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {isMainThread ? `${post.postsCount || 0}` : '1'}
                    </span>
                </div>
            </Card>

            {/* Modal Edit Post */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit {isMainThread ? 'Thread' : 'Post'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={5}
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsEditDialogOpen(false)} variant="ghost">Batal</Button>
                        <Button onClick={handleEditPost}>Simpan Perubahan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Komponen Utama ThreadPage
export default function ThreadPage({ forceLogout }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const currentUserId = getCurrentUserId();
    const { forceLogout: globalForceLogout } = useAuthLogout();
    const actualForceLogout = forceLogout || globalForceLogout;
    
    const [mainThread, setMainThread] = useState(null);
    const [posts, setPosts] = useState([]);
    const [replyContent, setReplyContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [profilePictureUrl, setProfilePictureUrl] = useState("");
    const fileInputRef = useRef(null);
    
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


    const fetchThreadData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Ambil Detail Thread
            const threadResponse = await fetch(`${apiUrl}/threads/${id}`);
            if (!threadResponse.ok) throw new Error("Gagal mengambil detail thread.");
            const threadData = await threadResponse.json();

            // 2. Ambil Post/Balasan
            const postsResponse = await fetch(`${apiUrl}/threads/${id}/posts`);
            if (!postsResponse.ok) throw new Error("Gagal mengambil balasan.");
            const postsData = await postsResponse.json();

            // Mapping Thread Utama
            const mappedThread = {
                id: threadData.data.thread_id,
                title: threadData.data.title,
                content: threadData.data.content,
                author: {
                    username: threadData.data.author?.username,
                    user_id: threadData.data.user_id,
                    profile_picture_path: threadData.data.author?.profile_picture_path,
                },
                username: threadData.data.author?.username,
                createdAt: new Date(threadData.data.created_at).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: '2-digit' }),
                likes: threadData.data._count.threadLikes,
                postsCount: threadData.data._count.posts,
                images: threadData.data.attachments?.map(att => att.file_path) || [], 
                isLiked: false,
            };
            setMainThread(mappedThread);

            // Mapping Balasan
            const mappedPosts = postsData.data.map(post => ({
                id: post.post_id,
                content: post.content,
                author: { 
                    username: post.author?.username,
                    user_id: post.user_id,
                    profile_picture_path: post.author?.profile_picture_path,
                },
                createdAt: new Date(post.created_at).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: '2-digit' }),
                likes: post._count.postLikes,
                images: post.attachments?.map(att => att.file_path) || [], 
                replyingTo: mappedThread.username, 
            }));
            setPosts(mappedPosts);

        } catch (error) {
            console.error("Error fetching thread data:", error.message);
            setMainThread(null);
            toast.error("Gagal memuat konten thread.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchThreadData();
    }, [fetchThreadData]);

    const handlePostDeleted = (isMainThread) => {
        if (isMainThread) {
            // Jika thread utama dihapus, redirect ke Home
            navigate('/');
        } else {
            // Jika balasan dihapus, refresh data
            fetchThreadData();
        }
    }

    // Handler untuk Attachment File
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validasi sederhana: Max 5MB
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Gagal", { description: "Ukuran file maksimal 5MB." });
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }
            setSelectedFile(file);
            toast.info(`File dipilih: ${file.name}. (Siap untuk diunggah)`);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleAddImageClick = () => {
        if (!isLoggedIn()) {
             toast.warning("Akses Ditolak", { description: "Anda harus login untuk mengunggah gambar." });
             return;
        }
        fileInputRef.current.click();
    };


    // Fungsi untuk mengirim balasan (Termasuk attachment jika ada)
    const handlePostReply = async () => {
        if (!isLoggedIn()) {
            toast.warning("Akses Ditolak", { description: "Anda harus login untuk membalas." });
            return;
        }

        if (replyContent.trim() === "" && !selectedFile) {
            toast.warning("Konten Kosong", { description: "Post harus berisi teks atau gambar." });
            return;
        }

        setIsSubmitting(true);
        const token = localStorage.getItem("authToken");
        
        try {
            // 1. Buat Post Baru (Tanpa Attachment)
            const postResponse = await fetch(`${apiUrl}/threads/${id}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    content: replyContent, 
                }),
            });

            const postData = await postResponse.json();
            if (!postResponse.ok) {
                throw new Error(postData.message || "Gagal membuat post balasan.");
            }
            const newPostId = postData.post.post_id;
            
            // 2. Jika ada file, upload attachment ke post yang baru dibuat
            if (selectedFile && newPostId) {
                const formData = new FormData();
                formData.append('file', selectedFile);

                const attachmentResponse = await fetch(`${apiUrl}/posts/${newPostId}/attachments`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData, 
                });

                if (!attachmentResponse.ok) {
                    toast.warning("Post dibuat, tetapi GAGAL mengunggah attachment.");
                } else {
                    toast.success("Attachment berhasil diunggah.");
                }
            }

            toast.success("Balasan berhasil dikirim.");

            // Reset state
            setReplyContent('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            
            // Muat ulang data thread dan posts
            fetchThreadData(); 

        } catch (error) {
            console.error("Error posting reply:", error);
            toast.error("Terjadi kesalahan saat mengirim balasan.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-svh items-center justify-center">
                <p>Loading thread...</p>
            </div>
        )
    }

    if (!mainThread) {
        return (
            <div className="flex min-h-svh flex-col items-center justify-center p-4">
                <p className="text-xl font-bold">Thread Not Found</p>
                <Button className="mt-4" onClick={() => navigate('/')}>Go Home</Button>
            </div>
        )
    }

    return (
        <div className="bg-gray-100 min-h-screen">
            {/* Header (Menggunakan GlobalHeader) */}
            <GlobalHeader 
                currentUser={currentUser}
                profilePictureUrl={profilePictureUrl}
                forceLogout={actualForceLogout}
            />

            {/* Main Content Thread */}
            <main className="container max-w-2xl mx-auto border-x border-gray-200 bg-white min-h-[calc(100vh-65px)]">
                
                {/* Bagian Navigasi Kembali dan Judul */}
                <div className="flex items-center gap-4 py-3 px-4 bg-white border-b border-gray-200 sticky top-[65px] z-10">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <span className="text-xl font-semibold">Thread</span>
                </div>

                {/* 1. Thread Utama */}
                <div className="p-4 bg-white border-b border-gray-200">
                    <PostItem 
                        post={mainThread} 
                        isMainThread={true} 
                        currentUserId={currentUserId}
                        currentUser={currentUser}
                        onPostEdited={fetchThreadData}
                        onPostDeleted={handlePostDeleted} 
                    />
                </div>
                
                {/* 2. Form Balasan */}
                {isLoggedIn() && (
                    <div className="p-4 bg-white border-b border-gray-200">
                        <div className="flex gap-3">
                            <Avatar className="w-10 h-10">
                                <AvatarImage src={profilePictureUrl} alt={currentUser?.username} />
                                <AvatarFallback>{getInitials(currentUser?.username)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <Textarea
                                    placeholder="Post your reply"
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    className="resize-none border-none focus-visible:ring-0 text-md p-2"
                                    rows={2}
                                    disabled={isSubmitting}
                                />
                                {selectedFile && (
                                    <div className="text-sm text-green-600 mt-1 ml-2 flex items-center justify-between p-2 bg-green-50 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <Upload className="h-3 w-3" /> File dipilih: {selectedFile.name} 
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="h-6 w-6 text-red-500 hover:bg-red-100">
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-3 gap-2">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                        className="hidden" 
                                        disabled={isSubmitting}
                                    />
                                    
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={handleAddImageClick} 
                                        className="text-blue-500 hover:bg-blue-50"
                                        disabled={isSubmitting}
                                    >
                                        Add Image
                                    </Button> 

                                    <Button 
                                        onClick={handlePostReply}
                                        disabled={isSubmitting || (!replyContent.trim() && !selectedFile)}
                                        className="rounded-full"
                                    >
                                        {isSubmitting ? "Posting..." : "Post"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 3. Daftar Balasan */}
                <div className="mt-0">
                    <h2 className="text-lg font-bold p-4 border-b">Replies ({posts.length})</h2>
                    {posts.map((post, index) => (
                        <div key={post.id} className={`p-0 bg-white border-gray-200 ${index < posts.length - 1 ? 'border-b' : ''}`}>
                            <PostItem 
                                post={post} 
                                isMainThread={false} 
                                currentUserId={currentUserId}
                                currentUser={currentUser}
                                onPostDeleted={handlePostDeleted} 
                                onPostEdited={fetchThreadData}  
                            />
                        </div>
                    ))}

                    {posts.length === 0 && (
                        <div className="p-6 text-center text-gray-500 bg-white border-t border-gray-200">
                            Belum ada balasan. Jadilah yang pertama!
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}