import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface ProfileItem {
  id: string;
  name: string;
  type: "audience" | "artist" | "venue";
  image?: string;
}

interface ProfileSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: ProfileItem[];
  onSelect: (profile: ProfileItem) => void;
  description?: string;
}

export function ProfileSelectionDialog({
  open,
  onOpenChange,
  profiles,
  onSelect,
  description = "어떤 프로필로 대화를 시작할까요?",
}: ProfileSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-ink)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-ink)]">프로필 선택</DialogTitle>
          <DialogDescription className="text-[var(--color-muted)]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-4">
          {profiles.map((profile) => (
            <button
              key={`${profile.type}-${profile.id}`}
              onClick={() => onSelect(profile)}
              className="flex items-center gap-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-3 text-left transition-colors hover:bg-[var(--color-surface-muted)] active:scale-[0.98]"
            >
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-surface-strong">
                {profile.image ? (
                  <img src={profile.image} alt={profile.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--color-disabled-surface)] text-xs font-bold text-[var(--color-ink)]">
                    {profile.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[var(--color-ink)]">{profile.name}</span>
                <span className="text-xs text-[var(--color-muted)]">
                  {profile.type === "artist" ? "아티스트" : profile.type === "venue" ? "베뉴" : "관객"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
