import type { AiKitchenDesignImage } from "../ai-development/aiKitchenDevelopmentTypes";

type AiGeneratedDesignImagesProps = {
  images: AiKitchenDesignImage[];
  onSelectImage: (image: AiKitchenDesignImage) => void;
};

export function AiGeneratedDesignImages({ images, onSelectImage }: AiGeneratedDesignImagesProps) {
  if (images.length === 0) {
    return (
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800 shadow-sm">
        The design finished, but no image was generated.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">This is the kitchen design image for you.</p>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left transition hover:border-sky-200 hover:shadow-sm"
            onClick={() => onSelectImage(image)}
          >
            <img className="aspect-[3/2] w-full object-cover" src={image.url} alt={image.label} />
            <div className="px-3 py-2 text-xs font-semibold text-slate-700">{image.label}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
