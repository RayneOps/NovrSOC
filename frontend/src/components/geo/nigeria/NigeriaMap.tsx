import Image from "next/image";

export function NigeriaMap() {
  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h2 className="text-xl font-bold mb-6">
        🇳🇬 Nigerian Attack Heat Map
      </h2>

      <div className="flex justify-center">
        <Image
          src="/maps/nigeria.svg"
          alt="Nigeria Map"
          width={700}
          height={600}
          className="w-full max-w-3xl"
        />
      </div>
    </div>
  );
}