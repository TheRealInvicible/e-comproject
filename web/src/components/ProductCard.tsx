import Image from 'next/image';
import Link from 'next/link';

interface ProductCardProps {
  title: string;
  price: number;
  image: string;
  href: string;
  discount?: number;
}

export default function ProductCard({ title, price, image, href, discount }: ProductCardProps) {
  const discountedPrice = discount ? price - (price * discount) / 100 : price;

  return (
    <Link href={href} className="group">
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4">
        <div className="relative aspect-square mb-4">
          <Image
            src={image}
            alt={title}
            fill
            className="object-contain"
          />
          {discount && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-sm font-bold px-2 py-1 rounded">
              -{discount}%
            </div>
          )}
        </div>
        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">
            ₦{discountedPrice.toLocaleString()}
          </span>
          {discount && (
            <span className="text-sm text-gray-500 line-through">
              ₦{price.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
