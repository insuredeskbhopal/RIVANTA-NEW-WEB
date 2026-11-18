import { renderMarkup } from '@/lib/site-markup';
import documentAttributes from '@/content/document.json';
import SiteRuntime from '@/components/site/SiteRuntime';

export default function RootLayout({ children }) {
  return (
    <html lang={documentAttributes.html.lang}>
      <head>{renderMarkup('head')}</head>
      <body className={documentAttributes.body.class}>
        {children}
        <SiteRuntime />
      </body>
    </html>
  );
}
