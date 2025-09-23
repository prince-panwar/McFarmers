
import React from "react";

export default function MemeBox(){
  // Only visible on very small screens via CSS
  return (
    <section className="card meme">
      <div className="meme-inner">
        <video
          className="meme-video"
          src="/assets/printer.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
      </div>
    </section>
  );
}
