import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ThemeContextType {
    showGradients: boolean;
    toggleGradients: () => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [showGradients, setShowGradients] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Load initial theme from localStorage
    useEffect(() => {
        let savedTheme: string | null = null;
        try { savedTheme = localStorage.getItem('theme'); } catch { /* Use the already-rendered theme. */ }
        const dark = savedTheme === 'dark' || (savedTheme !== 'light' && document.documentElement.classList.contains('dark'));
        setIsDarkMode(dark);
        document.documentElement.classList.toggle('dark', dark);
    }, []);

    const toggleGradients = () => setShowGradients(prev => !prev);

    const toggleDarkMode = () => {
        setIsDarkMode(prev => {
            const newValue = !prev;
            if (newValue) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
            return newValue;
        });
    };

    return (
        <ThemeContext.Provider value={{ showGradients, toggleGradients, isDarkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        if (typeof window === "undefined") {
            return { showGradients: true, toggleGradients: () => { }, isDarkMode: false, toggleDarkMode: () => { } };
        }
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
