'use client';
import Threads from '../components/Threads';
import BlurText from '../components/BlurText';

export default function Home() {
  return (
    // Change h-screen to h-full to respect the parent <main> tag's height.
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0">
        <Threads amplitude={1} distance={0} enableMouseInteraction />
      </div>
      <div className="relative z-10 flex items-center justify-center h-full">
        <BlurText
          text="LakeForge - Coming Soon"
          animateBy="words"
          direction="top"
          className="text-4xl md:text-6xl font-bold text-white text-center"
        />
      </div>
    </div>
  );
}