import { useEffect, useRef, useState } from "react";

const ProductImagePreview = ({
  src,
  blurDataURL,
  alt,
  className = "",
  wrapperClassName = "",
  loading = "lazy",
}) => {
  const imgRef = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    const img = imgRef.current;

    if (!img) return;

    if (img.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
      setHasError(false);
    }
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 ${wrapperClassName}`}
    >
      {!isLoaded && !hasError && blurDataURL && (
        <img
          src={blurDataURL}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-300"
        />
      )}

      {!hasError ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-xs text-slate-400">
          Unable to load image
        </div>
      )}
    </div>
  );
};

export default ProductImagePreview;
