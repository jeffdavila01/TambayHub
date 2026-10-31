export function LoadingState() {
    return <div className="p-10 flex flex-col items-center gap-3 animate-pulse"><div className="w-10 h-10 rounded-full bg-orange-200" /><p className="text-sm text-zinc-500">Loading Tambayan...</p></div>
}
export function EmptyState({ title = "Nothing here yet" }: { title?: string }) {
    return <div className="p-16 text-center border border-dashed rounded-2xl bg-white dark:bg-zinc-900 dark:border-zinc-800"><p className="font-medium">{title}</p><p className="text-sm text-zinc-500 mt-1">Start exploring TambayHub</p></div>
}
export function ErrorState({ msg = "Something went wrong" }: { msg?: string }) {
    return <div className="p-10 text-center bg-red-50 dark:bg-red-950/30 rounded-2xl text-red-600">{msg}</div>
}