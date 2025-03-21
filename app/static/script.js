document.addEventListener('DOMContentLoaded', function () {
  // --- Populate Models When a Brand is Selected (Using Jinja-rendered modelsByBrand) ---
  const brandsDropdown = document.getElementById('brandsDropdown');
  const modelsDropdown = document.getElementById('modelsDropdown');

  brandsDropdown.addEventListener('click', function (e) {
    if (e.target && e.target.matches('a')) {
      e.preventDefault();
      // Remove active class from other brands
      brandsDropdown.querySelectorAll('a.active').forEach(link => link.classList.remove('active'));
      e.target.classList.add('active');

      const selectedBrand = e.target.dataset.brand;
      modelsDropdown.innerHTML = "";
      // Disable models dropdown if no models available
      if (!modelsByBrand[selectedBrand] || modelsByBrand[selectedBrand].length === 0) {
        document.querySelector('.models').classList.add("disabled");
        return;
      }
      // Populate models dropdown with available models
      modelsByBrand[selectedBrand].forEach(model => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = "#";
        a.textContent = model;
        a.dataset.model = model.toLowerCase();
        li.appendChild(a);
        modelsDropdown.appendChild(li);
      });
      document.querySelector('.models').classList.remove("disabled");
    }
  });

  // --- Search Form Submission ---
  document.getElementById('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const queryParams = new URLSearchParams(formData).toString();
    window.location.href = `/?${queryParams}`;
  });

  // --- Slider Functionality ---
  const slides = document.querySelectorAll('.slider-single');
  let currentSlide = 0;
  const totalSlides = slides.length;
  const autoScrollInterval = 3000;

  function updateSlides() {
    const prevSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    const nextSlide = (currentSlide + 1) % totalSlides;
    slides.forEach((slide, i) => {
      slide.classList.remove('active', 'preactive', 'proactive');
      if (i === currentSlide) {
        slide.classList.add('active');
      } else if (i === prevSlide) {
        slide.classList.add('preactive');
      } else if (i === nextSlide) {
        slide.classList.add('proactive');
      }
    });
  }

  function slideRight() {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlides();
  }

  function slideLeft() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlides();
  }

  document.querySelector('.slider-right').addEventListener('click', function () {
    slideRight();
    resetAutoScroll();
  });
  document.querySelector('.slider-left').addEventListener('click', function () {
    slideLeft();
    resetAutoScroll();
  });

  updateSlides();
  let autoScrollTimer = setInterval(slideRight, autoScrollInterval);

  function resetAutoScroll() {
    clearInterval(autoScrollTimer);
    autoScrollTimer = setInterval(slideRight, autoScrollInterval);
  }

  // --- Marquee Functionality ---
  const root = document.documentElement;
  const marqueeContent = document.querySelector("ul.marquee-content");
  if (marqueeContent) {
    const marqueeElementsDisplayed = getComputedStyle(root)
                                        .getPropertyValue("--marquee-elements-displayed")
                                        .trim();
    root.style.setProperty("--marquee-elements", marqueeContent.children.length);
    for (let i = 0; i < marqueeElementsDisplayed; i++) {
      marqueeContent.appendChild(marqueeContent.children[i].cloneNode(true));
    }
  }
});
