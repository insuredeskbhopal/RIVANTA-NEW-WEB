export function initAboutGallery() {
  const module = document.querySelector('[data-module="about-gallery"]');
  if (!module) {
    return;
  }

  const viewport = module.querySelector('[data-about-gallery-viewport]');
  const slides = module.querySelectorAll('[data-about-gallery-slide]');
  const prevButton = module.querySelector('[data-carousel-prev]');
  const nextButton = module.querySelector('[data-carousel-next]');

  if (!viewport || slides.length === 0) {
    module.dataset.status = 'empty';
    return;
  }

  // A single photo needs no carousel behavior (arrows are not rendered).
  if (slides.length < 2) {
    module.dataset.status = 'static';
    return;
  }

  import('../vendor/embla-carousel-8.5.1.esm.js')
    .then(({ default: EmblaCarousel }) => {
      const embla = EmblaCarousel(viewport, {
        loop: true,
        axis: 'x',
        align: 'start',
        duration: 20,
        dragFree: false,
      });

      if (prevButton) {
        prevButton.addEventListener('click', () => {
          embla.scrollPrev();
        });
      }

      if (nextButton) {
        nextButton.addEventListener('click', () => {
          embla.scrollNext();
        });
      }

      module.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
          embla.scrollPrev();
        }

        if (event.key === 'ArrowRight') {
          embla.scrollNext();
        }
      });

      module.dataset.status = 'ready';
    })
    .catch((error) => {
      module.dataset.status = 'embla-load-failed';
      // eslint-disable-next-line no-console
      console.error('Embla failed to load for about gallery', error);
    });
}
