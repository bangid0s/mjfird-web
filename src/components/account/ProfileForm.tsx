"use client";

import { useActionState } from "react";
import { Label, Notice, Submit, authInput } from "@/components/auth/AuthForms";
import { updateClientProfile } from "@/lib/client/profile-actions";
import { PROFILE_LIMITS } from "@/lib/client/profile";

export type ClientProfileValues = {
  display_name: string;
  region: string;
  discord: string;
  x_handle: string;
  social_url: string;
};

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] leading-snug text-ink-faint">{children}</span>;
}

export default function ProfileForm({ initial, email }: { initial: ClientProfileValues; email: string }) {
  const [state, action] = useActionState(updateClientProfile, undefined);
  return (
    <form action={action} className="flex flex-col gap-6">
      <Notice state={state} />

      <Label text="Display name">
        <input
          name="display_name"
          required
          maxLength={PROFILE_LIMITS.displayName}
          defaultValue={initial.display_name}
          autoComplete="nickname"
          className={authInput}
        />
        <Hint>How I&apos;ll address you. It also fills in your name on new requests.</Hint>
      </Label>

      <Label text="Email">
        <input value={email} readOnly disabled className={authInput} />
        <Hint>The email you sign in with. Request updates go here.</Hint>
      </Label>

      <Label text="Region (optional)">
        <input
          name="region"
          maxLength={PROFILE_LIMITS.region}
          defaultValue={initial.region}
          placeholder="e.g. Indonesia (GMT+7)"
          autoComplete="country-name"
          className={authInput}
        />
        <Hint>Country or time zone, so I can plan calls and updates around your hours.</Hint>
      </Label>

      <div className="grid gap-6 sm:grid-cols-2">
        <Label text="Discord (optional)">
          <input
            name="discord"
            maxLength={PROFILE_LIMITS.discord}
            defaultValue={initial.discord}
            placeholder="username"
            autoCapitalize="off"
            spellCheck={false}
            className={authInput}
          />
        </Label>
        <Label text="X / Twitter (optional)">
          <input
            name="x_handle"
            maxLength={60}
            defaultValue={initial.x_handle ? `@${initial.x_handle}` : ""}
            placeholder="@handle"
            autoCapitalize="off"
            spellCheck={false}
            className={authInput}
          />
        </Label>
      </div>

      <Label text="Other social link (optional)">
        <input
          name="social_url"
          type="text"
          inputMode="url"
          maxLength={PROFILE_LIMITS.socialUrl}
          defaultValue={initial.social_url}
          placeholder="instagram.com/yourname"
          autoCapitalize="off"
          spellCheck={false}
          className={authInput}
        />
        <Hint>Instagram, VGen, ArtStation or your own site. One link.</Hint>
      </Label>

      <Submit>Save profile</Submit>
    </form>
  );
}
