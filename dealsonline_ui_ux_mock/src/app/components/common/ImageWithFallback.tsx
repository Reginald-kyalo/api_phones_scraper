import React, { useState, type ReactNode } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Rendered instead of the broken-image glyph when the source fails.
   *
   * Product images point at live retailer CDNs, so a share of them 404 or hotlink-
   * block at view time however healthy the capture was. Callers that already have
   * a neutral placeholder pass it here so a dead URL matches the no-image case
   * rather than showing a second, different broken state.
   */
  fallback?: ReactNode
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, fallback, ...rest } = props

  if (didError) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-transparent text-center align-middle ${className ?? ''}`}
        style={style}
      >
        {fallback ?? (
          <img src={ERROR_IMG_SRC} alt="" {...rest} data-original-url={src} />
        )}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      {...rest}
      onError={handleError}
    />
  )
}
