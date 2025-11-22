import { useEffect } from 'react';

export function PWAHead() {
  useEffect(() => {
    // Добавляем meta теги для PWA и iOS
    const metaTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'H2 Partner' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'theme-color', content: '#39B7FF' },
    ];

    const linkTags = [
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'apple-touch-icon', href: '/icon-192.svg' },
    ];

    // Добавляем meta теги
    metaTags.forEach(({ name, content }) => {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
    });

    // Добавляем link теги
    linkTags.forEach(({ rel, href }) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      document.head.appendChild(link);
    });

    // Cleanup function
    return () => {
      metaTags.forEach(({ name }) => {
        const meta = document.querySelector(`meta[name="${name}"]`);
        if (meta) meta.remove();
      });
      linkTags.forEach(({ rel }) => {
        const link = document.querySelector(`link[rel="${rel}"]`);
        if (link) link.remove();
      });
    };
  }, []);

  return null;
}
