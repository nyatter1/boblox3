import React, { useEffect, useState } from 'react';
import { getFoldedClothingPreview } from '../utils/clothingPreview';
import { Shirt, Tag } from 'lucide-react';

interface ClothingItemThumbProps {
  dataUrl?: string | null;
  type: 'shirt' | 'pants' | 'hair' | 'face' | 'animation' | 'accessory';
  name?: string;
  className?: string;
}

export default function ClothingItemThumb({
  dataUrl,
  type,
  name = '',
  className = '',
}: ClothingItemThumbProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!dataUrl || (type !== 'shirt' && type !== 'pants')) {
      setPreviewSrc(dataUrl || null);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    getFoldedClothingPreview(dataUrl, type)
      .then((url) => {
        if (!isCancelled) {
          setPreviewSrc(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setPreviewSrc(dataUrl);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [dataUrl, type]);

  if (previewSrc) {
    return (
      <img
        src={previewSrc}
        alt={name || type}
        className={`w-full h-full object-contain filter drop-shadow-xs transition-transform duration-200 ${className}`}
      />
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (type === 'shirt') {
    return <Shirt className="w-7 h-7 text-gray-500" />;
  }

  if (type === 'pants') {
    return <Tag className="w-7 h-7 text-gray-500" />;
  }

  return null;
}
