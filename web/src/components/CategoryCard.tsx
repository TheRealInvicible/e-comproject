import Image from 'next/image';
import Link from 'next/link';

interface CategoryCardProps {
  title: string;
  image: string;
  href: string;
  description: string;
}

export default function CategoryCard({ title, image, href, description }: CategoryCardProps) {
  return (
    <Link href={href} className="group">
      <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
        <div className="aspect-w-16 aspect-h-9 relative h-48">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transform group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
          <div className="absolute bottom-0 p-6 text-white">
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-sm opacity-90">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
