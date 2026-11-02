// Wren, the assistant's mascot. All four poses are stacked and crossfaded, so switching
// mood is instant (every image is already loaded) and smooth.
//   idle: default · thinking: working on a question · typing: writing the reply
//   searching: looking for belongings in photos

export type WrenMood = "idle" | "thinking" | "typing" | "searching";
const MOODS: WrenMood[] = ["idle", "thinking", "typing", "searching"];
const LABEL: Record<WrenMood, string> = {
  idle: "Wren",
  thinking: "Wren is thinking",
  typing: "Wren is writing a reply",
  searching: "Wren is searching your photos",
};

export function WrenAvatar({ mood = "idle", size = 40, ring = false, className = "" }: {
  mood?: WrenMood; size?: number; ring?: boolean; className?: string;
}) {
  return (
    <span role="img" aria-label={LABEL[mood]}
      className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-surface-3 ${ring ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""} ${className}`}
      style={{ width: size, height: size }}>
      {MOODS.map((m) => (
        // eslint-disable-next-line @next/next/no-img-element -- tiny static webp, crossfaded
        <img key={m} src={`/wren/${m}.webp`} alt="" width={size} height={size} draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: m === mood ? 1 : 0 }} />
      ))}
    </span>
  );
}
