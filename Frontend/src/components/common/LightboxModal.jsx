import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export function LightboxModal({ isOpen, images = [], currentIndex = 0, onClose, onNavigate }) {
  if (!isOpen || !images.length) return null;
  const currentImg = images[currentIndex] || images[0];

  return (
    <AnimatePresence>
      <motion.div 
        className="overlay-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ zIndex: 100000 }}
      >
        <div className="lightbox-modal" onClick={(e) => e.stopPropagation()} style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <button 
            type="button" 
            className="ghost-button"
            style={{ 
              position: "absolute", 
              top: 12, 
              right: 12, 
              color: "#fff", 
              background: "rgba(0,0,0,0.6)", 
              borderRadius: "50%", 
              padding: 10,
              border: "1px solid rgba(255,255,255,0.3)",
              cursor: "pointer",
              zIndex: 10
            }}
            onClick={onClose}
            aria-label="Close Lightbox"
          >
            <X size={24} />
          </button>
          
          <img 
            src={typeof currentImg === "string" ? currentImg : currentImg.image_url} 
            alt="Fullscreen listing photo" 
            className="lightbox-img"
          />

          {images.length > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", position: "absolute", top: "50%", left: 16, right: 16, transform: "translateY(-50%)", pointerEvents: "none", width: "calc(100% - 32px)" }}>
              <button 
                type="button" 
                className="ghost-button"
                style={{ pointerEvents: "auto", color: "#fff", background: "rgba(0,0,0,0.6)", borderRadius: "50%", padding: 12, border: "1px solid rgba(255,255,255,0.3)" }}
                onClick={() => onNavigate((currentIndex - 1 + images.length) % images.length)}
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                type="button" 
                className="ghost-button"
                style={{ pointerEvents: "auto", color: "#fff", background: "rgba(0,0,0,0.6)", borderRadius: "50%", padding: 12, border: "1px solid rgba(255,255,255,0.3)" }}
                onClick={() => onNavigate((currentIndex + 1) % images.length)}
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
