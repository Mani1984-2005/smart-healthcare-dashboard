import { HTMLAttributes } from "react";
type AvatarProps = HTMLAttributes<HTMLDivElement> & { name?: string; src?: string; size?: "sm" | "md" | "lg" };
const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" };
export default function Avatar({ className = "", name = "User", size = "md", src, ...props }: AvatarProps) { const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); return <div className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-700 font-semibold text-white ${sizes[size]} ${className}`} aria-label={name} {...props}>{src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials}</div>; }
