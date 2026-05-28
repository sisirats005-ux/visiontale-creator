/**
 * Performance Utilities
 * Image preloading, narration caching, and performance optimization helpers
 */

export class PerformanceManager {
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private narrationCache: Map<string, string> = new Map();
  private preloadQueue: Set<string> = new Set();

  /**
   * Preload an image and cache it
   */
  async preloadImage(url: string): Promise<HTMLImageElement> {
    // Return cached image if available
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }

    // Skip if already in queue
    if (this.preloadQueue.has(url)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.imageCache.has(url)) {
            clearInterval(checkInterval);
            resolve(this.imageCache.get(url)!);
          }
        }, 100);
      });
    }

    this.preloadQueue.add(url);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        this.imageCache.set(url, img);
        this.preloadQueue.delete(url);
        resolve(img);
      };
      
      img.onerror = () => {
        this.preloadQueue.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      img.src = url;
    });
  }

  /**
   * Preload multiple images in parallel
   */
  async preloadImages(urls: string[]): Promise<HTMLImageElement[]> {
    const promises = urls.map(url => this.preloadImage(url));
    return Promise.all(promises);
  }

  /**
   * Cache narration audio URL
   */
  cacheNarration(sceneIndex: number, audioUrl: string): void {
    this.narrationCache.set(String(sceneIndex), audioUrl);
  }

  /**
   * Get cached narration URL
   */
  getCachedNarration(sceneIndex: number): string | undefined {
    return this.narrationCache.get(String(sceneIndex));
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.imageCache.clear();
    this.narrationCache.clear();
    this.preloadQueue.clear();
  }

  /**
   * Clear image cache only
   */
  clearImageCache(): void {
    this.imageCache.clear();
    this.preloadQueue.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    imageCacheSize: number;
    narrationCacheSize: number;
    preloadQueueSize: number;
  } {
    return {
      imageCacheSize: this.imageCache.size,
      narrationCacheSize: this.narrationCache.size,
      preloadQueueSize: this.preloadQueue.size,
    };
  }

  /**
   * Estimate memory usage (rough estimate)
   */
  estimateMemoryUsage(): number {
    let totalBytes = 0;
    
    // Estimate image cache size (rough estimate: 2MB per image)
    totalBytes += this.imageCache.size * 2 * 1024 * 1024;
    
    // Estimate narration cache size (rough estimate: 500KB per audio)
    totalBytes += this.narrationCache.size * 500 * 1024;
    
    return totalBytes;
  }

  /**
   * Lazy load images using Intersection Observer
   */
  setupLazyLoading(images: HTMLImageElement[]): void {
    if (typeof IntersectionObserver === "undefined") {
      // Fallback: load all images immediately
      images.forEach(img => {
        if (img.dataset.src) {
          img.src = img.dataset.src;
        }
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              observer.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: "50px",
        threshold: 0.1,
      }
    );

    images.forEach((img) => {
      if (img.dataset.src) {
        observer.observe(img);
      }
    });
  }

  /**
   * Debounce function for performance
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(() => {
        func(...args);
      }, wait);
    };
  }

  /**
   * Throttle function for performance
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Request animation frame throttle
   */
  rafThrottle<T extends (...args: any[]) => any>(
    func: T
  ): (...args: Parameters<T>) => void {
    let rafId: number | null = null;
    
    return (...args: Parameters<T>) => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      
      rafId = requestAnimationFrame(() => {
        func(...args);
        rafId = null;
      });
    };
  }
}

// Singleton instance
let performanceManagerInstance: PerformanceManager | null = null;

export function getPerformanceManager(): PerformanceManager {
  if (!performanceManagerInstance) {
    performanceManagerInstance = new PerformanceManager();
  }
  return performanceManagerInstance;
}
