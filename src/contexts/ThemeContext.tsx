import { createContext, useContext, useEffect, useState} from 'react'
import type { ReactNode } from 'react'

type Theme = 'light' | 'dark'
interface ThemeContextType { theme: Theme; toggleTheme: () => void }

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('tambay-theme') as Theme
        if (saved) return saved
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    })

    useEffect(() => {
        localStorage.setItem('tambay-theme', theme)
        document.documentElement.classList.toggle('dark', theme === 'dark')
    }, [theme])

    const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
    return ctx
}