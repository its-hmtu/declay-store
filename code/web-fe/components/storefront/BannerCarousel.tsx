'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { UseEmblaCarouselType } from 'embla-carousel-react';
import type { Banner } from '@/lib/types';
import { bannersApi } from '@/lib/api';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);
  const [api, setApi] = useState<UseEmblaCarouselType[1] | null>(null);

  useEffect(() => {
    bannersApi.list()
      .then((res) => setBanners(res.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIdx(api.selectedScrollSnap());
    onSelect();
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || banners.length <= 1) return;
    const t = setInterval(() => api.scrollNext(), 5000);
    return () => clearInterval(t);
  }, [api, banners.length]);

  if (banners.length === 0) return null;

  return (
    <section className="relative w-full">
      <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
        <CarouselContent>
          {banners.map((banner) => (
            <CarouselItem key={banner.id} className="relative">
              {banner.linkUrl ? (
                <Link href={banner.linkUrl} className="block h-[60vh] min-h-[360px] md:h-[85vh]">
                  <BannerSlide banner={banner} />
                </Link>
              ) : (
                <div className="h-[60vh] min-h-[360px] md:h-[85vh]">
                  <BannerSlide banner={banner} />
                </div>
              )}
            </CarouselItem>
          ))}
        </CarouselContent>

        {banners.length > 1 && (
          <>
            <CarouselPrevious />
            <CarouselNext />
          </>
        )}
      </Carousel>

      {banners.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              onClick={(e) => {
                e.preventDefault();
                api?.scrollTo(i);
              }}
              aria-label={`Banner ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-500 ${i === idx ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BannerSlide({ banner }: { banner: Banner }) {
  return (
    <div className="relative w-full h-[60vh] min-h-[360px] md:h-[85vh] overflow-hidden bg-surface-alt">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.imageUrl} alt={banner.title ?? ''} className="w-full h-full object-cover" />
      {(banner.title || banner.subtitle) && (
        <div className="absolute inset-0 flex flex-col justify-center bg-linear-to-r from-black/55 via-black/20 to-transparent">
          <div className="max-w-7xl w-full mx-auto px-6 sm:px-10">
            {banner.title && <p className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold text-white max-w-2xl leading-tight">{banner.title}</p>}
            {banner.subtitle && <p className="mt-4 text-white/90 text-base sm:text-xl max-w-xl">{banner.subtitle}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
