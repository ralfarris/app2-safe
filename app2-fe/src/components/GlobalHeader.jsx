import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

function getInitials(name) {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase());
}

export default function GlobalHeader({ 
    currentUser, 
    profilePictureUrl, 
    forceLogout, 
    onSearchChange, 
    searchValue = "",
    allowSearch = true
}) {
    const navigate = useNavigate();
    const initials = getInitials(currentUser?.username);
    const isLoggedIn = !!currentUser;

    return (
        <header className="bg-white border-b sticky top-0 z-10">
            <div className="container mx-auto flex items-center justify-between p-4 gap-4 max-w-4xl">
                <div className="text-2xl font-bold text-gray-800 cursor-pointer shrink-0" onClick={() => navigate('/')}>
                    GameKom
                </div>
                
                {allowSearch && (
                    <div className="flex-1 max-w-lg relative">
                        {/* Search Input - Hapus icon 🔍 (Permintaan #5) */}
                        <Input 
                            className="border bg-gray-50 rounded-full px-4 py-2 w-full" 
                            placeholder="Search" 
                            onChange={(e) => onSearchChange(e.target.value)}
                            value={searchValue}
                        />
                    </div>
                )}
                
                <div className="flex items-center gap-3 shrink-0">
                    {isLoggedIn ? (
                        <>
                            <Button 
                                onClick={() => navigate('/create-thread')} 
                                className="rounded-full"
                                size="sm"
                            >
                                Create
                            </Button>
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Avatar className="cursor-pointer size-10 shrink-0">
                                        <AvatarImage src={profilePictureUrl} alt={currentUser.username} />
                                        <AvatarFallback>{initials}</AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => forceLogout("Anda berhasil log out.")} className="text-red-600 focus:text-red-600">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Log Out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <Button onClick={() => navigate('/login')} className="rounded-full">
                            Login
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}