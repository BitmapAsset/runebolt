'use client';

import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

interface StatCardProps {
  label: string;
  value: string;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <GlassCard className="p-6 text-center" hover>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <p className="font-mono text-2xl font-bold text-white md:text-3xl">
          {value}
        </p>
        <p className="mt-1 text-sm text-gray-400">{label}</p>
      </motion.div>
    </GlassCard>
  );
}
