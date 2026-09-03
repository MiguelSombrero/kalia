import { VisibilityControl } from "./VisibilityControl";
import type { Profile } from "./types";

export const ProfileView = ({ profile }: { profile: Profile }) => {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{profile.username}</p>
      <VisibilityControl username={profile.username} initialCellarPublic={profile.cellarPublic} />
    </div>
  );
};
