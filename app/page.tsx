import Link from "next/link";

const boards = [
  {
    id: "1",
    title: "Summer in Italy",
    note: "warm · coastal · relaxed",
    position: "left-[6%] top-[12%]",
    rotation: "-3deg",
  },
  {
    id: "2",
    title: "Dream Apartment",
    note: "natural · minimal · earthy",
    position: "left-[38%] top-[8%]",
    rotation: "2deg",
  },
  {
    id: "3",
    title: "Work Style",
    note: "clean · polished · neutral",
    position: "left-[68%] top-[18%]",
    rotation: "-2deg",
  },
  {
    id: "4",
    title: "Japan Trip",
    note: "soft · urban · playful",
    position: "left-[22%] top-[56%]",
    rotation: "3deg",
  },
  {
    id: "5",
    title: "Dream Vacation",
    note: "sunny · airy · colorful",
    position: "left-[58%] top-[56%]",
    rotation: "-4deg",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#eee7dc] px-6 py-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
              mosaic
            </p>

            <h1 className="mt-2 text-4xl font-semibold text-stone-900">
              Your worlds, all in one place.
            </h1>
          </div>

          <button className="rounded-full bg-stone-900 px-5 py-3 text-sm text-white">
            + Create Board
          </button>
        </header>

        <section
          className="relative h-[720px] overflow-hidden rounded-[34px] border-[14px] border-[#6e4b35] shadow-2xl"
          style={{
            backgroundColor: "#b98256",
            backgroundImage:
              "radial-gradient(rgba(83,52,31,0.22) 1px, transparent 1px)",
            backgroundSize: "7px 7px",
          }}
        >
          {boards.map((board, index) => (
            <Link
              key={board.id}
              href={`/boards/${board.id}`}
              className={`absolute ${board.position} group`}
              style={{
                transform: `rotate(${board.rotation})`,
              }}
            >
              <div className="relative w-[300px] rounded-md bg-[#f8f4ec] p-4 pb-6 shadow-xl transition duration-300 group-hover:scale-105 group-hover:shadow-2xl">
                <div
                  className={`absolute left-1/2 top-[-14px] z-10 h-6 w-6 -translate-x-1/2 rounded-full shadow ${
                    index % 3 === 0
                      ? "bg-red-700"
                      : index % 3 === 1
                      ? "bg-green-700"
                      : "bg-blue-700"
                  }`}
                />

                <div className="relative h-[155px] bg-[#ddd0bd]">
                  <div className="absolute left-4 top-5 h-20 w-24 rotate-[-5deg] bg-[#efe7d8] shadow-md" />
                  <div className="absolute right-5 top-7 h-24 w-20 rotate-[4deg] bg-[#b9aa8f] shadow-md" />
                </div>

                <h2 className="mt-4 text-xl font-semibold text-stone-900">
                  {board.title}
                </h2>

                <div className="mt-3 inline-block rotate-[-1deg] bg-[#fff0a6] px-4 py-2 shadow">
                  <p className="text-sm text-stone-700">{board.note}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}