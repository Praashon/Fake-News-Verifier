interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    color?: string
    text?: string
}

export default function LoadingSpinner({ 
    size = 'md', 
    color = 'primary',
    text 
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-5 w-5',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    }

    const colorClasses: Record<string, string> = {
        primary: 'border-primary',
        white: 'border-white',
        gray: 'border-gray-400'
    }

    return (
        <div className="flex flex-col items-center justify-center">
            <div 
                className={`
                    ${sizeClasses[size]} 
                    border-4 
                    ${colorClasses[color] || colorClasses.primary}
                    border-t-transparent 
                    rounded-full 
                    animate-spin
                `}
                role="status"
                aria-label="Loading"
            />
            {text && (
                <p className="mt-2 text-sm text-gray-400">
                    {text}
                </p>
            )}
        </div>
    )
}
