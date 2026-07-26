'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Shield,
  ArrowRight,
  Wallet,
  Send,
  Users,
  Gift,
  Github,
  Twitter,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import GlassCard from '@/components/GlassCard';
import StatCard from '@/components/StatCard';
import OnboardingFlow from '@/components/OnboardingFlow';
import ShibaInu from '@/components/ShibaInu';

const features = [
  {
    icon: Zap,
    title: 'Instant. Like, Actually Instant.',
    description: 'Send DOG in milliseconds. Blink and you\'ll miss it. No cap.',
    emoji: '⚡',
  },
  {
    icon: Shield,
    title: 'Your Keys, Your Treats',
    description: 'Non-custodial means nobody touches your DOG. Not even us. Pinky promise.',
    emoji: '🔒',
  },
  {
    icon: Zap,
    title: 'Bitcoin Native. No Bridges.',
    description: 'Built on Bitcoin L1. No wrapped tokens, no bridges to nowhere, no cap.',
    emoji: '₿',
  },
  {
    icon: Users,
    title: '@Username = Your Address',
    description: 'Send DOG to @satoshi like it\'s Venmo. Long addresses are so 2023.',
    emoji: '🏷️',
  },
  {
    icon: Gift,
    title: 'Gift Links Go Brrr',
    description: 'Send DOG to anyone with a link. Even your grandma who thinks Bitcoin is a video game.',
    emoji: '🎁',
  },
  {
    icon: Clock,
    title: 'Zero Brain Cells Required',
    description: 'We handle channels, routing, and complexity. You just vibe and send.',
    emoji: '🧠',
  },
];

const howItWorks = [
  {
    step: '1',
    title: 'Unleash Your Wallet',
    description: 'Connect your Unisat wallet. It takes 3 seconds. We counted.',
    emoji: '🔓',
    shibaReaction: 'Such wallet. Very connect.',
  },
  {
    step: '2',
    title: 'Type @username + Amount',
    description: 'No copy-pasting 64-character addresses. Just type who gets the DOG.',
    emoji: '📝',
    shibaReaction: 'Much simple. Wow.',
  },
  {
    step: '3',
    title: 'Hit Send. Done.',
    description: 'DOG arrives instantly. No waiting 10 minutes for a block. Go touch grass.',
    emoji: '🚀',
    shibaReaction: 'Very speed. So instant.',
  },
];

export default function LandingPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-bitcoin/8 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-cyan/6 blur-[120px]" />
          <div className="absolute right-1/3 top-1/3 h-64 w-64 rounded-full bg-purple-500/5 blur-[100px]" />
        </div>

        {/* Floating paw prints in background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-bitcoin/10"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                fontSize: `${20 + i * 4}px`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.05, 0.15, 0.05],
                rotate: [0, 10, 0],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            >
              🐾
            </motion.span>
          ))}
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-4xl text-center"
          >
            {/* Free badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-2 text-sm text-emerald-400"
            >
              <Sparkles size={14} />
              First 500 transactions FREE — zero fees, zero stress 🎉
            </motion.div>

            {/* Shiba hero */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-6"
            >
              <ShibaInu size="hero" mood="excited" animate />
            </motion.div>

            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
              <span className="gradient-text">Send DOG</span>
              <br />
              <span className="text-white">like a text message</span>
              <motion.span
                animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                className="ml-2 inline-block origin-[70%_80%]"
              >
                ⚡
              </motion.span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 sm:text-xl leading-relaxed">
              The fastest way to send DOG•GO•TO•THE•MOON.
              No channel management. No 64-character addresses.
              Just <span className="text-cyan font-medium">@username</span> and vibes.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowOnboarding(true)}
                className="fun-button flex items-center gap-2 text-lg"
              >
                <span>🐕</span>
                Let&apos;s Gooo
                <ArrowRight size={18} />
              </motion.button>

              <Link href="/app">
                <motion.button
                  whileHover={{ scale: 1.05, borderColor: 'rgba(247, 147, 26, 0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 rounded-2xl border border-dark-600 bg-dark-800/50 px-8 py-4 text-base font-semibold text-gray-300 backdrop-blur transition-all hover:text-white"
                >
                  <Wallet size={18} />
                  Unleash Your Wallet 🔓
                </motion.button>
              </Link>
            </div>

            {/* Scroll indicator */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mt-16 text-gray-600"
            >
              <ChevronDown size={24} className="mx-auto" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="relative py-12 border-y border-dark-700/50 bg-dark-800/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Happy Doges" value="10,000+" />
            <StatCard label="DOG Sent" value="50M+" />
            <StatCard label="Avg Speed" value="< 1 sec" />
            <StatCard label="Vibes" value="Immaculate" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-white sm:text-5xl">
              Three Steps. <span className="gradient-text">That&apos;s It.</span>
            </h2>
            <p className="mt-4 text-gray-400 text-lg">
              If you can send a text, you can send DOG. It&apos;s that simple.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {howItWorks.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <GlassCard hover className="relative h-full p-8 text-center overflow-hidden group">
                  {/* Step number glow */}
                  <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full bg-bitcoin/10 blur-2xl transition-all group-hover:bg-bitcoin/20" />

                  {/* Emoji */}
                  <motion.div
                    whileHover={{ scale: 1.3, rotate: [0, -10, 10, 0] }}
                    className="relative mx-auto mb-4 text-5xl"
                  >
                    {item.emoji}
                  </motion.div>

                  {/* Step badge */}
                  <div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-bitcoin to-orange-600 text-xs font-bold text-white">
                    {item.step}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">{item.description}</p>

                  {/* Shiba reaction */}
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-bitcoin/20 bg-bitcoin/5 px-3 py-1 text-xs text-bitcoin/80">
                    🐕 {item.shibaReaction}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 sm:py-28 border-t border-dark-700/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-3xl font-bold text-white sm:text-5xl">
              Why <span className="gradient-text">RuneBolt</span>? 🐕⚡
            </h2>
            <p className="mt-4 text-gray-400 text-lg">
              Because sending DOG should be fun, not a PhD thesis.
            </p>
          </motion.div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <GlassCard hover className="h-full p-7 group">
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: [0, -5, 5, 0] }}
                    className="mb-4 text-4xl"
                  >
                    {feature.emoji}
                  </motion.div>
                  <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {feature.description}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 sm:py-28 border-t border-dark-700/30">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <ShibaInu size="xl" mood="love" animate />
            <h2 className="mt-6 text-3xl font-bold text-white sm:text-5xl">
              Ready to send DOG at
              <br />
              <span className="gradient-text">the speed of light?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-gray-400">
              Join thousands of DOG holders who are already sending
              instant transfers. First 500 txs are free. No excuses.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowOnboarding(true)}
                className="fun-button flex items-center gap-2 text-lg"
              >
                🚀 Start Sending Now
                <ArrowRight size={18} />
              </motion.button>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              No signup required. Just connect wallet and go brrrr.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-dark-700/50 py-12 bg-dark-800/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-bitcoin to-orange-600">
                <Zap size={16} className="text-white" />
              </div>
              <span className="gradient-text text-lg font-bold">RuneBolt</span>
              <span className="text-2xl">🐕</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://github.com/runebolt" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Github size={20} />
              </a>
              <a href="https://twitter.com/runebolt" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Twitter size={20} />
              </a>
            </div>
            <p className="text-sm text-gray-500">
              Built for the DOG army. Much love. Very community. 🐕
            </p>
          </div>
        </div>
      </footer>

      <OnboardingFlow
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={(data) => {
          console.log('Onboarding complete:', data);
          setShowOnboarding(false);
        }}
      />
    </div>
  );
}
