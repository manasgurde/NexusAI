import { ImageGenSkeleton } from "@/components/dashboard/ToolSkeleton";

export default function Loading() {
  return (
    <div className="bg-[#0a0a0f] min-h-screen text-white">
      <ImageGenSkeleton />
    </div>
  );
}
