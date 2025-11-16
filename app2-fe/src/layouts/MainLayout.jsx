import * as React from 'react';
import GlobalHeader from '@/components/GlobalHeader';

export default function MainLayout({
    children,
    currentUser,
    profilePictureUrl,
    forceLogout,
    title,
    onSearchChange,
    searchValue,
    allowSearch = true
}) {
    return (
        <div className="min-h-screen bg-gray-100">
            <GlobalHeader
                currentUser={currentUser}
                profilePictureUrl={profilePictureUrl}
                forceLogout={forceLogout}
                onSearchChange={onSearchChange}
                searchValue={searchValue}
                allowSearch={allowSearch}
            />
            
            <main className="container max-w-2xl mx-auto">
                {title && (
                    <h1 className="text-2xl font-bold text-gray-800 p-4 border-b bg-white">{title}</h1>
                )}
                {children}
            </main>
        </div>
    );
}