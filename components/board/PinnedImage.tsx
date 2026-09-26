type PinnedImageProps = {
  src: string;
  alt: string;
  rotation?: number;
  pinColor?: string;
};

export default function PinnedImage({
  src,
  alt,
  rotation = 0,
  pinColor = "#b91c1c",
}: PinnedImageProps) {
  return (
    <div
      className="relative w-56 bg-[#f8f4ea] p-3 pb-7 shadow-xl transition duration-200 hover:scale-105 hover:z-20"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* push pin */}
      <div className="absolute left-1/2 top-[-14px] z-20 -translate-x-1/2">
        <div
          className="h-6 w-6 rounded-full border-2 border-black/20 shadow-md"
          style={{ backgroundColor: pinColor }}
        />
        <div className="mx-auto h-3 w-[2px] bg-stone-700/70" />
      </div>

      <img
        src={src}
        alt={alt}
        className="h-52 w-full object-cover"
      />
    </div>
  );
}