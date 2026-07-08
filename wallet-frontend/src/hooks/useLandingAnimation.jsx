import { useEffect } from "react";

export default function useLandingAnimation() {
  useEffect(() => {
    const preloadTimer = setTimeout(() => {
      document.querySelector(".preloader")?.classList.add("hide");
    }, 450);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("show");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16 }
    );

    const elements = document.querySelectorAll(".reveal,.card,.feature");

    elements.forEach((el, index) => {
      el.style.transitionDelay = `${Math.min(index * 90, 420)}ms`;
      observer.observe(el);
    });

    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    let animationFrameId;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 18;
      mouseY = (event.clientY / window.innerHeight - 0.5) * 18;
    };

    const animateBlobs = () => {
      currentX += (mouseX - currentX) * 0.08;
      currentY += (mouseY - currentY) * 0.08;

      document.querySelectorAll(".blob").forEach((blob) => {
        blob.style.transform = `translate(${currentX}px, ${currentY}px)`;
      });

      animationFrameId = requestAnimationFrame(animateBlobs);
    };

    document.addEventListener("mousemove", handleMouseMove);
    animateBlobs();

    return () => {
      clearTimeout(preloadTimer);
      observer.disconnect();
      document.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
}
