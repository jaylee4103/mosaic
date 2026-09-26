const images = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    alt: "Coastal landscape",
    rotation: -4,
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d",
    alt: "Warm interior",
    rotation: 3,
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b",
    alt: "Neutral outfit",
    rotation: -2,
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace",
    alt: "Wood furniture",
    rotation: 5,
  },
];

export default function BoardPage() {
  return (
    <main className="min-h-screen bg-[#eee7dc] px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-stone-500">
              mosaic
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-stone-900">
              Summer in Italy
            </h1>
          </div>

          <button className="rounded-full bg-stone-900 px-5 py-3 text-sm text-white">
            + Pin inspiration
          </button>
        </div>

        <section
          className="relative min-h-[720px] overflow-hidden rounded-[32px] border-[14px] border-[#6e4b35] p-10 shadow-2xl"
          style={{
            backgroundColor: "#b98256",
            backgroundImage:
              "radial-gradient(rgba(83,52,31,0.22) 1px, transparent 1px)",
            backgroundSize: "7px 7px",
          }}
        >
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="relative mx-auto w-full max-w-xs bg-[#faf7f2] p-3 pb-8 shadow-xl transition hover:z-20 hover:scale-105"
                style={{ transform: `rotate(${image.rotation}deg)` }}
              >
                <div
                  className={`absolute left-1/2 top-[-14px] z-10 h-6 w-6 -translate-x-1/2 rounded-full border border-black/20 shadow ${
                    index % 3 === 0
                      ? "bg-red-700"
                      : index % 3 === 1
                      ? "bg-blue-700"
                      : "bg-green-700"
                  }`}
                />

                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-60 w-full object-cover"
                />
              </div>
            ))}

            <div className="mx-auto max-w-xs rotate-[2deg] bg-[#fff0a6] p-6 shadow-lg">
              <p className="text-sm font-medium uppercase tracking-wider text-stone-500">
                note
              </p>
              <p className="mt-3 text-lg leading-7 text-stone-700">
                I like the warm tones, natural textures, and relaxed coastal feel.
              </p>
            </div>

            <div className="col-span-full lg:col-span-2">
              <div className="rotate-[-1deg] bg-[#f8f4ec] p-7 shadow-xl">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Your Vibe
                </p>

                <h2 className="mt-2 text-3xl font-semibold text-stone-900">
                  Sun-Washed Mediterranean
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-stone-600">
                  Warm, relaxed, natural, and minimal with soft coastal influence.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    "Cream",
                    "Terracotta",
                    "Olive",
                    "Warm Brown",
                    "Linen",
                    "Wood",
                    "Ceramic",
                    "Rattan",
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <button className="mt-7 rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white">
                  Shop this vibe
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}