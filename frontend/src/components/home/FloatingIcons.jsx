import React from 'react';
import { motion } from 'framer-motion';
import { FaStethoscope, FaHeartbeat, FaPills, FaNotesMedical, FaSyringe, FaAmbulance } from 'react-icons/fa';

const icons = [
  { Icon: FaStethoscope, size: 48, x: '8%', y: '18%', duration: 18, delay: 0 },
  { Icon: FaHeartbeat, size: 42, x: '82%', y: '22%', duration: 20, delay: 1.5 },
  { Icon: FaPills, size: 36, x: '22%', y: '72%', duration: 22, delay: 0.8 },
  { Icon: FaNotesMedical, size: 44, x: '72%', y: '78%', duration: 19, delay: 2.5 },
  { Icon: FaSyringe, size: 34, x: '48%', y: '8%', duration: 24, delay: 1 },
  { Icon: FaAmbulance, size: 50, x: '3%', y: '52%', duration: 21, delay: 3.5 },
  { Icon: FaStethoscope, size: 30, x: '58%', y: '88%', duration: 23, delay: 1.2 },
  { Icon: FaHeartbeat, size: 52, x: '92%', y: '58%', duration: 17, delay: 3 },
  { Icon: FaPills, size: 28, x: '38%', y: '92%', duration: 25, delay: 2 },
  { Icon: FaNotesMedical, size: 38, x: '65%', y: '3%', duration: 20, delay: 4 },
];

function randomY(from, to) {
  return `${from + Math.random() * (to - from)}%`;
}

export default function FloatingIcons() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((item, i) => {
        const yRange = [parseFloat(item.y) - 8, parseFloat(item.y) + 8];
        return (
          <motion.div
            key={i}
            className="absolute text-white/8"
            style={{ left: item.x, top: item.y, fontSize: item.size }}
            animate={{
              y: [0, -20, 12, -8, 0],
              x: [0, 15, -12, 8, 0],
              rotate: [0, 8, -6, 4, 0],
              opacity: [0.07, 0.14, 0.09, 0.16, 0.07],
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <item.Icon />
          </motion.div>
        );
      })}
    </div>
  );
}
