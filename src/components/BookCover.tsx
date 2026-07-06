const PLACEHOLDER_COLORS = [
  'from-blue-600 to-blue-800',
  'from-emerald-600 to-emerald-800',
  'from-purple-600 to-purple-800',
  'from-amber-600 to-amber-800',
  'from-rose-600 to-rose-800',
  'from-cyan-600 to-cyan-800',
  'from-indigo-600 to-indigo-800',
  'from-teal-600 to-teal-800',
];

const SIZES = {
  xs:   { w: 48,  h: 72 },
  sm:   { w: 80,  h: 120 },
  md:   { w: 128, h: 192 },
  lg:   { w: 200, h: 300 },
  xl:   { w: 280, h: 420 },
};

interface BookCoverProps {
  title: string;
  author: string;
  size: keyof typeof SIZES;
  className?: string;
}

export function BookCover({ title, author, size, className = '' }: BookCoverProps) {
  const dim = SIZES[size];
  const colorIndex = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    % PLACEHOLDER_COLORS.length;

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg shadow-book
        bg-gradient-to-br ${PLACEHOLDER_COLORS[colorIndex]}
        flex flex-col justify-end
        ${className}
      `}
      style={{ width: dim.w, height: dim.h }}
      role="img"
      aria-label={`Cover of "${title}" by ${author}`}
    >
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 5V4zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Spine highlight */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-r from-white/20 to-transparent" />

      {/* Title area */}
      <div className="relative z-10 p-2">
        <p className={`text-white font-semibold leading-tight line-clamp-3 ${
          size === 'xs' ? 'text-[8px]' : size === 'sm' ? 'text-[10px]' : 'text-xs'
        }`}>
          {title}
        </p>
        <p className={`text-white/60 mt-0.5 line-clamp-1 ${
          size === 'xs' ? 'text-[7px]' : size === 'sm' ? 'text-[9px]' : 'text-[10px]'
        }`}>
          {author}
        </p>
      </div>

      {/* Decorative line */}
      <div className="absolute top-3 left-2 right-2 h-[0.5px] bg-white/15" />
    </div>
  );
}
