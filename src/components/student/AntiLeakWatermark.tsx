import React from 'react';

interface AntiLeakWatermarkProps {
  studentName: string;
  studentRollNumber?: string;
  examCode: string;
}

export const AntiLeakWatermark: React.FC<AntiLeakWatermarkProps> = ({
  studentName,
  studentRollNumber,
  examCode,
}) => {
  const watermarkText = `${studentName.toUpperCase()} • ${studentRollNumber ? `ID: ${studentRollNumber} • ` : ''}${examCode} • SURYA SECURE PROCTOR`;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden select-none opacity-[0.04] dark:opacity-[0.06] flex flex-col justify-around py-4">
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="whitespace-nowrap font-mono font-black text-xs sm:text-sm tracking-widest text-slate-900 dark:text-white -rotate-12 transform select-none"
          style={{
            marginLeft: `${(rowIndex % 2) * -120}px`,
          }}
        >
          {Array.from({ length: 5 }).map((_, colIndex) => (
            <span key={colIndex} className="mr-24 inline-block select-none">
              {watermarkText}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};
