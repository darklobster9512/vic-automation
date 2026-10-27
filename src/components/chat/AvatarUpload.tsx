import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

interface AvatarUploadProps {
  avatarUrl?: string | null;
  name?: string | null;
  size?: number;
  editable?: boolean;
  onUploaded?: (url: string) => void;
  className?: string;
  /** If set, file is stored as `${user.id}/${fileKey}-${timestamp}.png` instead of the shared avatar.png */
  fileKey?: string;
  /** Update the logged-in user's profile avatar (default true) */
  updateProfile?: boolean;
}

export function AvatarUpload({
  avatarUrl,
  name,
  size = 32,
  editable = false,
  onUploaded,
  className,
  fileKey,
  updateProfile = true,
}: AvatarUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(name);
  const bgColor = hashColor(name ?? "user");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const path = fileKey ? `${user.id}/${fileKey}-${Date.now()}.png` : `${user.id}/avatar.png`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const cleanUrl = data.publicUrl;

      if (updateProfile) await supabase.from("profiles").update({ avatar_url: cleanUrl } as any).eq("id", user.id);
      onUploaded?.(`${cleanUrl}?t=${Date.now()}`);
      toast.success("Profilbild aktualisiert");
      setOpen(false);
    } catch (err: any) {
      toast.error("Upload fehlgeschlagen: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const avatar = (
    <div
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center overflow-hidden font-semibold text-white select-none cursor-pointer",
        editable && "hover:opacity-80 transition-opacity",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: avatarUrl ? "transparent" : bgColor,
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );

  if (!editable) return avatar;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{avatar}</PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <p className="text-xs text-muted-foreground mb-2">Profilbild ändern</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
        >
          <Camera className="h-4 w-4" />
          {uploading ? "Lädt..." : "Bild hochladen"}
        </button>
      </PopoverContent>
    </Popover>
  );
}

export { getInitials, hashColor };
