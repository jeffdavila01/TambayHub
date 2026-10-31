import { useState } from 'react'

export default function Avatar({ src, name, className = '' }: { src?: string | null, name: string, className?: string }) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null)
    return <span className={`orb-avatar ${className}`}>
        {src && src !== failedSrc
            ? <img src={src} alt={name} onError={() => setFailedSrc(src)} />
            : name.trim().charAt(0).toUpperCase() || 'T'}
    </span>
}
