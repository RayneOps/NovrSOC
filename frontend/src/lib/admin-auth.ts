const TOKEN_KEY = 'admin_token';

export function getAdminToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function isAdminAuthenticated(): boolean {
    return getAdminToken() !== null;
}

export function adminSignOut(): void {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/login';
}
