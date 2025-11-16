import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Upload, XCircle } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';

// Helper function
function isLoggedIn() {
    return !!localStorage.getItem("authToken");
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

const apiUrl = import.meta.env.VITE_API_URL;

// Komponen Ikon Panah Kembali (Back Arrow)
const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5"></path>
        <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
);

export default function CreateThread({ forceLogout }) {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const currentUser = getCurrentUser();

    // Utility untuk mengambil URL gambar profil (dummy atau dari backend)
    const resolveImageUrl = (path) => {
        if (!path) return "";
        if (/^https?:\/\//i.test(path)) return path;
        return `${apiUrl}/${path}`; 
    };
    
    // State tambahan untuk profilePictureUrl agar bisa di passing ke GlobalHeader
    const [profilePictureUrl, setProfilePictureUrl] = useState("");
    
    const fetchUserProfile = React.useCallback(async () => {
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

    React.useEffect(() => {
        if (currentUser) {
            fetchUserProfile();
        }
    }, [currentUser, fetchUserProfile]);


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


    const handlePublish = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            return toast.error("Validation Error", { description: "Judul dan konten harus diisi." });
        }

        setIsSubmitting(true);
        const token = localStorage.getItem("authToken");
        let newThreadId = null;

        try {
            // 1. Buat Thread Baru (Tanpa Attachment)
            const threadResponse = await fetch(`${apiUrl}/threads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    title: title.trim(), 
                    content: content.trim() // VULNERABLE XSS
                })
            });

            const threadData = await threadResponse.json();
            if (!threadResponse.ok) {
                throw new Error(threadData.message || `Gagal membuat thread! status: ${threadResponse.status}`);
            }
            newThreadId = threadData.thread.thread_id;
            
            toast.success("Thread berhasil dibuat.");

            // 2. Jika ada file, upload attachment
            if (selectedFile && newThreadId) {
                const formData = new FormData();
                formData.append('file', selectedFile);

                const attachmentResponse = await fetch(`${apiUrl}/threads/${newThreadId}/attachments`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData, // VULNERABLE RCE/Path Traversal
                });

                if (!attachmentResponse.ok) {
                    toast.warning("Thread dibuat, tetapi GAGAL mengunggah attachment.", { description: "Cek log server untuk A03: RCE/Path Traversal." });
                } else {
                    toast.success("Attachment berhasil diunggah.");
                }
            }

            // Redirect ke homepage setelah selesai
            navigate('/');
            
        } catch (error) {
            console.error("Failed to create thread:", error);
            toast.error("Gagal mempublikasikan thread.", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <MainLayout 
            currentUser={currentUser}
            profilePictureUrl={profilePictureUrl}
            forceLogout={forceLogout}
            allowSearch={false}
        >
            <main className="container max-w-2xl mx-auto py-6">
                <Card className="overflow-hidden">
                    <div className="p-4 flex items-center gap-4 border-b">
                        <button onClick={() => navigate(-1)} className="hover:bg-gray-100 rounded-full p-2 transition-colors">
                            <BackArrowIcon />
                        </button>
                        <h1 className="text-xl font-bold">Thread</h1> 
                    </div>

                    <div className="p-6">
                        <form onSubmit={handlePublish} className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="title" className="font-semibold text-gray-700">Title</label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter thread title here"
                                    className="border-gray-300"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="content" className="font-semibold text-gray-700">Content</label>
                                <Textarea
                                    id="content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="What's on your mind?"
                                    className="border-gray-300 min-h-[150px]"
                                    disabled={isSubmitting}
                                />
                            </div>

                            {selectedFile && (
                                <div className="text-sm text-green-600 flex items-center justify-between p-2 bg-green-50 rounded-md">
                                    <div className="flex items-center gap-2">
                                        <Upload className="h-3 w-3" /> File siap diunggah: {selectedFile.name} 
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="h-6 w-6 text-red-500 hover:bg-red-100">
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-4">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    className="hidden" 
                                    disabled={isSubmitting}
                                />
                                
                                <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={handleAddImageClick}
                                    disabled={isSubmitting}
                                >
                                    Add Image
                                </Button>
                                
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Publishing...' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Card>
            </main>
        </MainLayout>
    );
}