import React from 'react';
import { motion } from 'framer-motion';
import { FaBrain, FaHandHoldingHeart, FaHeart, FaLeaf, FaCommentDots, FaBalanceScale, FaRegSmile, FaSun, FaFeatherAlt, FaSeedling } from 'react-icons/fa';

const icons = [
  { Icon: FaBrain, size: 54, x: '5%', y: '15%', duration: 20, delay: 0 },
  { Icon: FaHandHoldingHeart, size: 48, x: '82%', y: '20%', duration: 22, delay: 1.5 },
  { Icon: FaLeaf, size: 40, x: '20%', y: '75%', duration: 24, delay: 0.8 },
  { Icon: FaHeart, size: 46, x: '75%', y: '80%', duration: 18, delay: 2.5 },
  { Icon: FaCommentDots, size: 38, x: '50%', y: '5%', duration: 26, delay: 1 },
  { Icon: FaBalanceScale, size: 44, x: '3%', y: '55%', duration: 21, delay: 3.5 },
  { Icon: FaRegSmile, size: 36, x: '60%', y: '90%', duration: 23, delay: 1.2 },
  { Icon: FaSun, size: 52, x: '93%', y: '60%', duration: 19, delay: 3 },
  { Icon: FaFeatherAlt, size: 32, x: '40%', y: '95%', duration: 25, delay: 2 },
  { Icon: FaSeedling, size: 42, x: '68%', y: '2%', duration: 20, delay: 4 },
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
